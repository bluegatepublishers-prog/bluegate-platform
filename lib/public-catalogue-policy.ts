export interface PublicCatalogueBookState {
  publisherId: string | null;
  publicCatalogueVisible: boolean;
  published: boolean;
  archived: boolean;
  publisherActive: boolean;
}

export function isPublicCatalogueEligible(
  book: PublicCatalogueBookState,
  bluegatePublisherId: string,
) {
  return (
    book.publisherId === bluegatePublisherId &&
    book.publicCatalogueVisible &&
    book.published &&
    !book.archived &&
    book.publisherActive
  );
}
