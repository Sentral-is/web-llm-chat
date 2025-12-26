import React, { useState } from "react";
import { Model, useAppConfig } from "../store";
import style from "./model-row.module.scss";
import {
  GroupedModel,
  getQuantization,
  formatModelName,
  getVariantLabel,
  formatVRAM,
  formatContextWindow,
  formatParameterSize,
} from "../utils/model";
import { ChevronDown, ChevronRight, Check } from "lucide-react";

interface ModelGroupRowProps {
  groupedModel: GroupedModel;
  determineModelIcon: (model: Model) => JSX.Element;
  onSelectModel: (model: string) => void;
  onClose: () => void;
}

const ModelGroupRow: React.FC<ModelGroupRowProps> = ({
  groupedModel,
  determineModelIcon,
  onSelectModel,
  onClose,
}) => {
  const config = useAppConfig();
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any model in the group is selected
  const hasSelectedModel = groupedModel.models.some(
    (m) => config.modelConfig.model === m.name,
  );

  const handleHeaderClick = () => {
    // If only one model variant, select it directly
    if (groupedModel.models.length === 1) {
      onSelectModel(groupedModel.models[0].name);
      onClose();
    } else {
      // Otherwise toggle expansion
      setIsExpanded(!isExpanded);
    }
  };

  const handleVariantClick = (e: React.MouseEvent, modelName: string) => {
    e.stopPropagation();
    onSelectModel(modelName);
    onClose();
  };

  const formattedBaseName = formatModelName(groupedModel.baseName);
  const parameterSize = formatParameterSize(
    groupedModel.models[0]?.parameter,
    groupedModel.models[0]?.size,
  );

  return (
    <div className={style["model-group"]}>
      <div
        className={`${style["model-card"]} ${hasSelectedModel ? style["selected"] : ""}`}
        onClick={handleHeaderClick}
      >
        <div className={style["model-card-header"]}>
          {groupedModel.benchmark_score !== undefined && (
            <div className={style["benchmark-score"]}>
              {groupedModel.benchmark_score.toFixed(1)}
            </div>
          )}
          <div className={style["model-info"]}>
            <div className={style["model-icon"]}>
              {determineModelIcon(groupedModel.models[0].name)}
            </div>
            <div className={style["model-name-container"]}>
              <h3 className={style["model-name"]}>{formattedBaseName}</h3>
              <div className={style["model-meta"]}>
                {groupedModel.file_size && (
                  <span className={style["file-size"]}>
                    {groupedModel.file_size}
                  </span>
                )}
                {parameterSize && (
                  <>
                    <span className={style["separator"]}>•</span>
                    <span className={style["parameter-size"]}>
                      {parameterSize}
                    </span>
                  </>
                )}
                {groupedModel.models.length > 1 && (
                  <>
                    <span className={style["separator"]}>•</span>
                    <span className={style["variant-count"]}>
                      {groupedModel.models.length} variants
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {groupedModel.models.length > 1 && (
            <div className={style["expand-icon"]}>
              {isExpanded ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded variants */}
      {isExpanded && groupedModel.models.length > 1 && (
        <div className={style["variant-list"]}>
          {groupedModel.models.map((model) => {
            const isSelected = config.modelConfig.model === model.name;
            const quantization = getQuantization(model.name);
            const variantLabel = getVariantLabel(
              model.name,
              model.context_window_size,
            );
            const vramDisplay = formatVRAM(model.vram_required_MB);
            const contextDisplay = formatContextWindow(
              model.context_window_size,
            );

            return (
              <div
                key={model.name}
                className={`${style["variant-item"]} ${isSelected ? style["selected-variant"] : ""}`}
                onClick={(e) => handleVariantClick(e, model.name)}
              >
                <div className={style["variant-badge"]}>
                  {quantization?.toUpperCase().replace(/_\d+$/, "")}
                </div>
                <div className={style["variant-content"]}>
                  <div className={style["variant-header"]}>
                    <span className={style["variant-label"]}>
                      {variantLabel}
                    </span>
                  </div>
                  <div className={style["variant-tags"]}>
                    {vramDisplay && (
                      <span className={`${style["tag"]} ${style["tag-vram"]}`}>
                        {vramDisplay} VRAM
                      </span>
                    )}
                    {contextDisplay && (
                      <span
                        className={`${style["tag"]} ${style["tag-context"]}`}
                      >
                        {contextDisplay} context
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <span className={style["selected-indicator"]}>
                    <Check size={24} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ModelGroupRow;
