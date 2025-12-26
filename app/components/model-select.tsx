import React, { useState, useEffect, useCallback, useRef } from "react";
import { Cpu, Search } from "lucide-react";
import ModelGroupRow from "./model-group-row";
import {
  modelDetailsList,
  enrichModelWithMetadata,
  groupModelsByBaseName,
  GroupedModel,
} from "../utils/model";

import style from "./model-select.module.scss";
import { Modal, Select } from "./ui-lib";

import Locale from "../locales";
import { IconButton } from "./button";
import { ModelFamily } from "../constant";
import { Model, useAppConfig } from "../store";
import { ModelRecord } from "../client/api";

export interface ModelSearchProps {
  onClose: () => void;
  availableModels: string[];
  onSelectModel: (model: string) => void;
}

const modelFamilies: {
  [key: string]: {
    name: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
} = {};

for (const modelDetail of modelDetailsList) {
  modelFamilies[modelDetail.family] = {
    name: modelDetail.name,
    icon: modelDetail.icon,
  };
}

type ModelSortOption = "score" | "name" | "parameter" | "vram" | "context";

const sizeCategoryOptions = [
  { value: "Small (<3B)", label: Locale.ModelSelect.SizeCategory.Small },
  { value: "Standard (3-7B)", label: Locale.ModelSelect.SizeCategory.Standard },
  // { value: "Medium (7-30B)", label: Locale.ModelSelect.SizeCategory.Medium },
  // { value: "Large (30B+)", label: Locale.ModelSelect.SizeCategory.Large },
];

interface SearchInputProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const SearchInput: React.FC<SearchInputProps> = ({
  searchTerm,
  setSearchTerm,
  inputRef,
}) => {
  return (
    <div className={style["input-container"]}>
      <input
        ref={inputRef}
        type="text"
        placeholder={Locale.ModelSelect.SearchPlaceholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={style["input"]}
      />
      <Search className={style["input-icon"]} />
    </div>
  );
};

const ModelSelect: React.FC<ModelSearchProps> = ({
  onClose,
  availableModels,
  onSelectModel,
}) => {
  const config = useAppConfig();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredModels, setFilteredModels] = useState<GroupedModel[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedSizeCategories, setSelectedSizeCategories] = useState<
    string[]
  >([]);
  const [sortOption, setSortOption] = useState<ModelSortOption>("score");
  const [showFilters, setShowFilters] = useState(false);

  const determineModelIcon = (model: Model) => {
    const modelFamily = identifyModelFamily(model);
    const modelDetail = modelDetailsList.find(
      (md) => modelFamily && modelFamily === md.family,
    );
    return (
      <div className={style["model-icon"]}>
        {modelDetail?.icon ? <modelDetail.icon /> : <Cpu />}
      </div>
    );
  };

  const identifyModelFamily = useCallback(
    (model: Model): ModelFamily | null => {
      return config.models.find((m) => m.name === model)?.family || null;
    },
    [config.models],
  );

  const collectModels = useCallback(
    (models: string[]): ModelRecord[] => {
      return models
        .map((modelName) => {
          const modelRecord = config.models.find((m) => m.name === modelName);
          if (!modelRecord) return null;
          return enrichModelWithMetadata(modelRecord);
        })
        .filter((m) => m !== null) as ModelRecord[];
    },
    [config.models],
  );

  const parseParameterSize = (model: ModelRecord): number | undefined => {
    if (model.parameter !== undefined) return model.parameter;
    if (!model.size) return undefined;

    const numericSize = parseFloat(model.size);
    if (Number.isNaN(numericSize)) return undefined;
    const unit = model.size.toUpperCase().slice(-1);
    return unit === "K" ? numericSize / 1000 : numericSize;
  };

  const getGroupedParameterSize = (groupedModel: GroupedModel) => {
    for (const model of groupedModel.models) {
      const value = parseParameterSize(model);
      if (value !== undefined) return value;
    }
    return undefined;
  };

  const getGroupedVram = (groupedModel: GroupedModel) => {
    const vramValues = groupedModel.models
      .map((model) => model.vram_required_MB)
      .filter((value): value is number => value !== undefined);
    return vramValues.length > 0 ? Math.min(...vramValues) : undefined;
  };

  const getGroupedContextWindow = (groupedModel: GroupedModel) => {
    const contextValues = groupedModel.models
      .map((model) => model.context_window_size)
      .filter((value): value is number => value !== undefined);
    return contextValues.length > 0 ? Math.max(...contextValues) : undefined;
  };

  const compareWithFallback = (
    aValue: number | undefined,
    bValue: number | undefined,
    direction: "asc" | "desc",
  ) => {
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    return direction === "desc" ? bValue - aValue : aValue - bValue;
  };

  const sortGroupedModels = useCallback(
    (models: GroupedModel[]): GroupedModel[] => {
      return [...models].sort((a, b) => {
        if (sortOption === "score") {
          const scoreCompare = compareWithFallback(
            a.benchmark_score,
            b.benchmark_score,
            "desc",
          );
          if (scoreCompare !== 0) return scoreCompare;
        }

        if (sortOption === "parameter") {
          const parameterCompare = compareWithFallback(
            getGroupedParameterSize(a),
            getGroupedParameterSize(b),
            "desc",
          );
          if (parameterCompare !== 0) return parameterCompare;
        }

        if (sortOption === "vram") {
          const vramCompare = compareWithFallback(
            getGroupedVram(a),
            getGroupedVram(b),
            "asc",
          );
          if (vramCompare !== 0) return vramCompare;
        }

        if (sortOption === "context") {
          const contextCompare = compareWithFallback(
            getGroupedContextWindow(a),
            getGroupedContextWindow(b),
            "desc",
          );
          if (contextCompare !== 0) return contextCompare;
        }

        return a.displayName.localeCompare(b.displayName);
      });
    },
    [sortOption],
  );

  useEffect(() => {
    const enrichedModels = collectModels(availableModels);

    let filtered = enrichedModels;

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (model) =>
          model.display_name?.toLowerCase().includes(lowerSearchTerm) ||
          model.name.toLowerCase().includes(lowerSearchTerm),
      );
    }

    if (selectedFamilies.length > 0) {
      filtered = filtered.filter((model) => {
        const family = identifyModelFamily(model.name);
        return family && selectedFamilies.includes(family);
      });
    }

    if (selectedSizeCategories.length > 0) {
      filtered = filtered.filter(
        (model) =>
          model.size_category &&
          selectedSizeCategories.includes(model.size_category),
      );
    }

    // Group models by base name
    const groupedModels = groupModelsByBaseName(filtered);
    setFilteredModels(sortGroupedModels(groupedModels));
  }, [
    searchTerm,
    availableModels,
    selectedFamilies,
    selectedSizeCategories,
    sortOption,
    collectModels,
    identifyModelFamily,
    sortGroupedModels,
  ]);

  const handleToggleFamilyFilter = (family: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(family)
        ? prev.filter((f) => f !== family)
        : [...prev, family],
    );
  };

  const handleToggleSizeCategoryFilter = (category: string) => {
    setSelectedSizeCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const familyFilterCount = selectedFamilies.length;
  const sizeFilterCount = selectedSizeCategories.length;

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, []);

  return (
    <div className="screen-model-container">
      <Modal
        title={Locale.ModelSelect.Title}
        subtitle={Locale.ModelSelect.Subtitle}
        onClose={onClose}
        containerClassName={style["model-select-container"]}
        contentClassName={style["model-select-content"]}
      >
        <div className={style["header"]}>
          <div className={style["header-row"]}>
            <div className={style["search-wrap"]}>
              <SearchInput
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                inputRef={searchInputRef}
              />
            </div>
            <div className={style["controls"]}>
              <IconButton
                onClick={() => setShowFilters((prev) => !prev)}
                bordered
                text={
                  familyFilterCount + sizeFilterCount > 0
                    ? `Filters (${familyFilterCount + sizeFilterCount})`
                    : "Filters"
                }
                className={style["filter-trigger"]}
              />
              <div className={style["sort-row"]}>
                <div className={style["sort-label"]}>
                  {Locale.ModelSelect.SortLabel}
                </div>
                <Select
                  value={sortOption}
                  onChange={(e) =>
                    setSortOption(e.target.value as ModelSortOption)
                  }
                  className={style["sort-select"]}
                >
                  <option value="score">
                    {Locale.ModelSelect.SortOption.Score}
                  </option>
                  <option value="name">
                    {Locale.ModelSelect.SortOption.Name}
                  </option>
                  <option value="parameter">
                    {Locale.ModelSelect.SortOption.Parameter}
                  </option>
                  <option value="vram">
                    {Locale.ModelSelect.SortOption.VRAM}
                  </option>
                  <option value="context">
                    {Locale.ModelSelect.SortOption.Context}
                  </option>
                </Select>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className={style["inline-filter-panel"]}>
              <div className={style["filter-group"]}>
                <div className={style["filter-label"]}>
                  {Locale.ModelSelect.FilterFamily}
                </div>
                <div className={style["filter-options"]}>
                  {Object.entries(modelFamilies).map(
                    ([key, { name, icon: Icon }]) => (
                      <IconButton
                        key={key}
                        onClick={() => handleToggleFamilyFilter(key)}
                        bordered
                        text={name}
                        icon={
                          <div className={style["icon"]}>
                            {Icon ? <Icon /> : <Cpu />}
                          </div>
                        }
                        className={`${style["filter-button"]}${selectedFamilies.includes(key) ? " " + style["selected-filter"] : ""}`}
                      />
                    ),
                  )}
                </div>
              </div>

              <div className={style["filter-group"]}>
                <div className={style["filter-label"]}>
                  {Locale.ModelSelect.FilterSize}
                </div>
                <div className={style["filter-options"]}>
                  {sizeCategoryOptions.map((option) => (
                    <IconButton
                      key={option.value}
                      onClick={() =>
                        handleToggleSizeCategoryFilter(option.value)
                      }
                      bordered
                      text={option.label}
                      className={`${style["filter-button"]}${selectedSizeCategories.includes(option.value) ? " " + style["selected-filter"] : ""}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={style["model-list-scroll"]}>
          <div className={style["model-list"]}>
            {filteredModels.length > 0 ? (
              filteredModels.map((groupedModel) => (
                <ModelGroupRow
                  key={groupedModel.baseName}
                  groupedModel={groupedModel}
                  determineModelIcon={determineModelIcon}
                  onSelectModel={onSelectModel}
                  onClose={onClose}
                />
              ))
            ) : (
              <div className={style["empty-state"]}>
                <div className={style["empty-title"]}>
                  {Locale.ModelSelect.EmptyTitle}
                </div>
                <div className={style["empty-subtitle"]}>
                  {Locale.ModelSelect.EmptyDescription}
                </div>
                <div className={style["empty-filters"]}>
                  {searchTerm ? (
                    <span className={style["empty-chip"]}>
                      {Locale.ModelSelect.EmptySearch} “{searchTerm}”
                    </span>
                  ) : null}
                  {selectedFamilies.length > 0 ? (
                    <span className={style["empty-chip"]}>
                      {Locale.ModelSelect.EmptyFamily}{" "}
                      {selectedFamilies
                        .map((family) => modelFamilies[family]?.name ?? family)
                        .join(", ")}
                    </span>
                  ) : null}
                  {selectedSizeCategories.length > 0 ? (
                    <span className={style["empty-chip"]}>
                      {Locale.ModelSelect.EmptySize}{" "}
                      {selectedSizeCategories.join(", ")}
                    </span>
                  ) : null}
                  {selectedFamilies.length === 0 &&
                  selectedSizeCategories.length === 0 &&
                  !searchTerm ? (
                    <span className={style["empty-chip"]}>
                      {Locale.ModelSelect.EmptyNoFilters}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ModelSelect;
