import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { productApi, type CategoryNode } from "../api/product.api";

export interface FlattenedCategoryOption {
  id: string;
  categoryCode: string;
  name: string;
  breadcrumbTrail: string[];
  parentTrailLabel: string;
  isLeaf: boolean;
  subCategoryCount: number;
  node: CategoryNode;
}

export function flattenCategoryTree(
  nodes: CategoryNode[],
  ancestors: string[] = [],
): FlattenedCategoryOption[] {
  const results: FlattenedCategoryOption[] = [];

  for (const node of nodes) {
    const subCategories = node.subCategories ?? [];
    const currentTrail = [...ancestors, node.name];
    const isLeaf = subCategories.length === 0;

    results.push({
      id: node.id,
      categoryCode: node.categoryCode,
      name: node.name,
      breadcrumbTrail: currentTrail,
      parentTrailLabel:
        ancestors.length > 0 ? [...ancestors].reverse().join(" > ") : "Root",
      isLeaf,
      subCategoryCount: countTotalDescendants(node),
      node,
    });

    if (subCategories.length > 0) {
      results.push(...flattenCategoryTree(subCategories, currentTrail));
    }
  }

  return results;
}

export function countTotalDescendants(node: CategoryNode): number {
  const subs = node.subCategories ?? [];
  if (subs.length === 0) {
    return node.productCount ?? 0;
  }
  return subs.reduce(
    (sum, child) => sum + 1 + countTotalDescendants(child),
    0,
  );
}

export function findCategoryPathById(
  nodes: CategoryNode[],
  targetId: string,
  trail: CategoryNode[] = [],
): CategoryNode[] | null {
  for (const node of nodes) {
    const nextTrail = [...trail, node];
    if (node.id === targetId) {
      return nextTrail;
    }
    if (node.subCategories && node.subCategories.length > 0) {
      const found = findCategoryPathById(
        node.subCategories,
        targetId,
        nextTrail,
      );
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function useCategoriesTree() {
  const query = useQuery({
    queryKey: ["categories", "tree"],
    queryFn: () => productApi.getCategoriesTree(),
    staleTime: 5 * 60_000,
  });

  const flattenedCategories = useMemo(
    () => flattenCategoryTree(query.data ?? []),
    [query.data],
  );

  return {
    ...query,
    categoriesTree: query.data ?? [],
    flattenedCategories,
  };
}
