import type { GeometryProfile } from "./types";

export const DEFAULT_GEOMETRY_PROFILE: GeometryProfile = {
  linesPerPage: 25,
  charsPerLine: 58,
  averageCharsPerWord: 6.5,
  formatBoxWidthInches: 6.5,
  leftMarginInches: 0.75,
  rightMarginInches: 0.75,
  lineSpacingPoints: 28,
  tabs: {
    qaLabelInches: 0.5,
    qaTextInches: 1.0,
    speakerInches: 1.5,
    parentheticalInches: 2.0,
    centerInches: 3.25,
    continuationInches: 0,
  },
};
