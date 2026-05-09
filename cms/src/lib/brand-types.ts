// Shared brand types consumed by article authoring + brand profile UIs.
// Mirrors the original content-hub-cms shape so brand.json portability holds.

export type Camera = {
  id: string;
  title: string;
  description: string;
  is_default: boolean;
};

export type ExamplePhoto = {
  id: string;
  url: string;
  description: string;
};

export type ExamplePhotoCategory = {
  id: string;
  label: string;
  photos: ExamplePhoto[];
};
