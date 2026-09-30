export type CategoryType = "income" | "expense";

export type CategoryListItem = {
    id: string;
    name: string;
    type: CategoryType;
    isDefault: boolean;
    createdAt: string;
};
