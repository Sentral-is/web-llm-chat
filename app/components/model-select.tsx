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
import { Modal } from "./ui-lib";

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

  const sortModels = useCallback(
    (models: string[]): ModelRecord[] => {
      // Enrich models with metadata
      const enrichedModels = models
        .map((modelName) => {
          const modelRecord = config.models.find((m) => m.name === modelName);
          if (!modelRecord) return null;
          return enrichModelWithMetadata(modelRecord);
        })
        .filter((m) => m !== null) as ModelRecord[];

      // Sort by:
      // 1. Benchmark score (descending)
      // 2. Then alphabetically
      return enrichedModels.sort((a, b) => {
        // Sort by benchmark score (higher first)
        if (
          a.benchmark_score !== undefined &&
          b.benchmark_score !== undefined
        ) {
          if (a.benchmark_score !== b.benchmark_score) {
            return b.benchmark_score - a.benchmark_score;
          }
        }
        if (a.benchmark_score !== undefined && b.benchmark_score === undefined)
          return -1;
        if (a.benchmark_score === undefined && b.benchmark_score !== undefined)
          return 1;

        // Finally alphabetically
        return a.display_name.localeCompare(b.display_name);
      });
    },
    [config.models],
  );

  useEffect(() => {
    const sortedModels = sortModels(availableModels);

    let filtered = sortedModels;

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = sortedModels.filter(
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

    // Group models by base name
    const groupedModels = groupModelsByBaseName(filtered);

    setFilteredModels(groupedModels);
  }, [
    searchTerm,
    availableModels,
    selectedFamilies,
    sortModels,
    identifyModelFamily,
  ]);

  const handleToggleFamilyFilter = (family: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(family)
        ? prev.filter((f) => f !== family)
        : [...prev, family],
    );
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, []);

  return (
    <div className="screen-model-container">
      <Modal title={Locale.ModelSelect.Title} onClose={onClose}>
        <div className={style["header"]}>
          <SearchInput
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            inputRef={searchInputRef}
          />
          <div className={style["model-family-filter"]}>
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
                  className={`${style["model-family-button"]}${selectedFamilies.includes(key) ? " " + style["selected-model-family"] : ""}`}
                />
              ),
            )}
          </div>
        </div>
        <div className={style["model-list"]}>
          {filteredModels.map((groupedModel) => (
            <ModelGroupRow
              key={groupedModel.baseName}
              groupedModel={groupedModel}
              determineModelIcon={determineModelIcon}
              onSelectModel={onSelectModel}
              onClose={onClose}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default ModelSelect;
