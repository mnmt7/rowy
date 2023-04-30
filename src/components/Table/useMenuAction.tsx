import { useCallback, useState, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useSnackbar } from "notistack";
import { get, find } from "lodash-es";

import {
  tableScope,
  tableSchemaAtom,
  tableRowsAtom,
  updateFieldAtom,
  SelectedCell,
} from "@src/atoms/tableScope";
import { getFieldProp, getFieldType } from "@src/components/fields";
import { ColumnConfig } from "@src/types/table";

import { FieldType } from "@src/constants/fields";

import { format } from "date-fns";
import { DATE_FORMAT, DATE_TIME_FORMAT } from "@src/constants/dates";
import { isDate, isFunction } from "lodash-es";
import { getDurationString } from "@src/components/fields/Duration/utils";

export const SUPPORTED_TYPES_COPY = new Set([
  // TEXT
  FieldType.shortText,
  FieldType.longText,
  FieldType.richText,
  FieldType.email,
  FieldType.phone,
  FieldType.url,
  // SELECT
  FieldType.singleSelect,
  FieldType.multiSelect,
  // NUMERIC
  FieldType.checkbox,
  FieldType.number,
  FieldType.percentage,
  FieldType.rating,
  FieldType.slider,
  FieldType.color,
  FieldType.geoPoint,
  // DATE & TIME
  FieldType.date,
  FieldType.dateTime,
  FieldType.duration,
  // FILE
  FieldType.image,
  FieldType.file,
  // CODE
  FieldType.json,
  FieldType.code,
  FieldType.markdown,
  FieldType.array,
  // AUDIT
  FieldType.createdBy,
  FieldType.updatedBy,
  FieldType.createdAt,
  FieldType.updatedAt,
]);

export const SUPPORTED_TYPES_PASTE = new Set([
  // TEXT
  FieldType.shortText,
  FieldType.longText,
  FieldType.richText,
  FieldType.email,
  FieldType.phone,
  FieldType.url,
  // NUMERIC
  FieldType.number,
  FieldType.percentage,
  FieldType.rating,
  FieldType.slider,
  // CODE
  FieldType.json,
  FieldType.code,
  FieldType.markdown,
]);

export function useMenuAction(
  selectedCell: SelectedCell | null,
  handleClose?: Function
) {
  const { enqueueSnackbar } = useSnackbar();
  const [tableSchema] = useAtom(tableSchemaAtom, tableScope);
  const [tableRows] = useAtom(tableRowsAtom, tableScope);
  const updateField = useSetAtom(updateFieldAtom, tableScope);
  const [cellValue, setCellValue] = useState<any>();
  const [selectedCol, setSelectedCol] = useState<ColumnConfig>();

  const handleCopy = useCallback(async () => {
    try {
      if (cellValue !== undefined && cellValue !== null && cellValue !== "") {
        const value = getValue(cellValue);
        await navigator.clipboard.writeText(value);
        enqueueSnackbar("Copied");
      } else {
        await navigator.clipboard.writeText("");
      }
    } catch (error) {
      enqueueSnackbar(`Failed to copy:${error}`, { variant: "error" });
    }
    if (handleClose) handleClose();
  }, [cellValue, enqueueSnackbar, handleClose]);

  const handleCut = useCallback(async () => {
    try {
      if (!selectedCell || !selectedCol) return;
      if (cellValue !== undefined && cellValue !== null && cellValue !== "") {
        const value = getValue(cellValue);
        await navigator.clipboard.writeText(value);
        enqueueSnackbar("Copied");
      } else {
        await navigator.clipboard.writeText("");
      }
      if (
        cellValue !== undefined &&
        selectedCol.type !== FieldType.createdAt &&
        selectedCol.type !== FieldType.updatedAt &&
        selectedCol.type !== FieldType.createdBy &&
        selectedCol.type !== FieldType.updatedBy &&
        selectedCol.type !== FieldType.checkbox
      )
        updateField({
          path: selectedCell.path,
          fieldName: selectedCol.fieldName,
          value: undefined,
          deleteField: true,
        });
    } catch (error) {
      enqueueSnackbar(`Failed to cut: ${error}`, { variant: "error" });
    }
    if (handleClose) handleClose();
  }, [
    cellValue,
    selectedCell,
    selectedCol,
    updateField,
    enqueueSnackbar,
    handleClose,
  ]);

  const handlePaste = useCallback(async () => {
    try {
      if (!selectedCell || !selectedCol) return;
      let text;
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {
        enqueueSnackbar(`Read clipboard permission denied.`, {
          variant: "error",
        });
        return;
      }
      const cellDataType = getFieldProp("dataType", getFieldType(selectedCol));
      let parsed;
      switch (cellDataType) {
        case "number":
          parsed = Number(text);
          if (isNaN(parsed)) throw new Error(`${text} is not a number`);
          break;
        case "string":
          parsed = text;
          break;
        default:
          parsed = JSON.parse(text);
          break;
      }

      if (selectedCol.type === FieldType.slider) {
        if (parsed < selectedCol.config?.min) parsed = selectedCol.config?.min;
        if (parsed > selectedCol.config?.max) parsed = selectedCol.config?.max;
      }

      if (selectedCol.type === FieldType.rating) {
        if (parsed < 0) parsed = 0;
        if (parsed > (selectedCol.config?.max || 5))
          parsed = selectedCol.config?.max || 5;
      }

      if (selectedCol.type === FieldType.percentage) {
        parsed = parsed / 100;
      }
      updateField({
        path: selectedCell.path,
        fieldName: selectedCol.fieldName,
        value: parsed,
      });
    } catch (error) {
      enqueueSnackbar(
        `${selectedCol?.type} field does not support the data type being pasted`,
        { variant: "error" }
      );
    }
    if (handleClose) handleClose();
  }, [selectedCell, selectedCol, updateField, enqueueSnackbar, handleClose]);

  useEffect(() => {
    if (!selectedCell) return setCellValue("");
    const selectedCol = tableSchema.columns?.[selectedCell.columnKey];
    if (!selectedCol) return setCellValue("");
    setSelectedCol(selectedCol);
    const selectedRow = find(tableRows, ["_rowy_ref.path", selectedCell.path]);
    setCellValue(get(selectedRow, selectedCol.fieldName));
  }, [selectedCell, tableSchema, tableRows]);

  const getValue = useCallback(
    (cellValue: any) => {
      switch (selectedCol?.type) {
        case FieldType.percentage:
          return cellValue * 100;
        case FieldType.json:
        case FieldType.color:
        case FieldType.geoPoint:
          return JSON.stringify(cellValue);
        case FieldType.date:
          if (
            (!!cellValue && isFunction(cellValue.toDate)) ||
            isDate(cellValue)
          ) {
            try {
              return format(
                isDate(cellValue) ? cellValue : cellValue.toDate(),
                selectedCol.config?.format || DATE_FORMAT
              );
            } catch (e) {
              return;
            }
          }
          return;
        case FieldType.dateTime:
        case FieldType.createdAt:
        case FieldType.updatedAt:
          if (
            (!!cellValue && isFunction(cellValue.toDate)) ||
            isDate(cellValue)
          ) {
            try {
              return format(
                isDate(cellValue) ? cellValue : cellValue.toDate(),
                selectedCol.config?.format || DATE_TIME_FORMAT
              );
            } catch (e) {
              return;
            }
          }
          return;
        case FieldType.duration:
          return getDurationString(
            cellValue.start.toDate(),
            cellValue.end.toDate()
          );
        case FieldType.image:
        case FieldType.file:
          return cellValue[0].downloadURL;
        case FieldType.createdBy:
        case FieldType.updatedBy:
          return cellValue.displayName;
        default:
          return cellValue;
      }
    },
    [cellValue, selectedCol]
  );

  const checkEnabledCopy = useCallback(
    (func: Function) => {
      return function () {
        if (SUPPORTED_TYPES_COPY.has(selectedCol?.type)) {
          return func();
        } else {
          enqueueSnackbar(`${selectedCol?.type} field cannot be copied`, {
            variant: "error",
          });
        }
      };
    },
    [selectedCol]
  );

  const checkEnabledPaste = useCallback(
    (func: Function) => {
      return function () {
        if (SUPPORTED_TYPES_PASTE.has(selectedCol?.type)) {
          return func();
        } else {
          enqueueSnackbar(
            `${selectedCol?.type} field does not support paste functionality`,
            {
              variant: "error",
            }
          );
        }
      };
    },
    [selectedCol]
  );

  return {
    handleCopy: checkEnabledCopy(handleCopy),
    handleCut: checkEnabledCopy(handleCut),
    handlePaste: checkEnabledPaste(handlePaste),
    cellValue,
  };
}
