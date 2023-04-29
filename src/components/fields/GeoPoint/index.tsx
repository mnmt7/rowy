import { lazy } from "react";
import { GeoPoint } from "firebase/firestore";
import { IFieldConfig, FieldType } from "@src/components/fields/types";
import withRenderTableCell from "@src/components/Table/TableCell/withRenderTableCell";

import GeoPointIcon from "@mui/icons-material/PinDropOutlined";
import DisplayCell from "./DisplayCell";
import BasicContextMenuActions from "@src/components/Table/ContextMenu/BasicCellContextMenuActions";

const SideDrawerField = lazy(
  () =>
    import(
      "./SideDrawerField" /* webpackChunkName: "SideDrawerField-GeoPoint" */
    )
);

export const config: IFieldConfig = {
  type: FieldType.geoPoint,
  name: "GeoPoint (Alpha)",
  group: "Numeric",
  dataType: "{latitude:number; longitude:number}",
  initialValue: {},
  icon: <GeoPointIcon />,
  description: "Geo point is represented as latitude/longitude pair.",
  TableCell: withRenderTableCell(DisplayCell, SideDrawerField, "popover", {
    popoverProps: { PaperProps: { sx: { p: 1, pt: 0 } } },
  }),
  SideDrawerField,
  csvImportParser: (value: string) => {
    try {
      const { latitude, longitude } = JSON.parse(value);
      if (latitude && longitude) {
        return new GeoPoint(latitude, longitude);
      }
      throw new Error();
    } catch (e) {
      console.error("Invalid GeoPoint value");
      return null;
    }
  },
  contextMenuActions: BasicContextMenuActions,
};
export default config;
