import {
  decodeShortStringField,
  type PrimitiveValue,
  toNumber,
} from "@/models/shared";

export const ITEM_MODEL_NAME = "Item";

export interface RawItem {
  item_id: PrimitiveValue<string>;
  name: PrimitiveValue<string>;
  description: PrimitiveValue<string>;
  price: PrimitiveValue<string>;
  sell_price: PrimitiveValue<string>;
  effect_type: PrimitiveValue<string>;
  effect_value: PrimitiveValue<string>;
  target_symbol: PrimitiveValue<string>;
}

export interface Item {
  itemId: number;
  name: string;
  description: string;
  price: number;
  sellPrice: number;
  effectType: number;
  effectValue: number;
  targetSymbol: string;
}

export const ItemModel = {
  getModelName() {
    return ITEM_MODEL_NAME;
  },
  parse(data: RawItem | undefined | null): Item | undefined {
    if (!data) {
      return undefined;
    }

    return {
      itemId: toNumber(data.item_id),
      name: decodeShortStringField(data.name),
      description: decodeShortStringField(data.description),
      price: toNumber(data.price),
      sellPrice: toNumber(data.sell_price),
      effectType: toNumber(data.effect_type),
      effectValue: toNumber(data.effect_value),
      targetSymbol: decodeShortStringField(data.target_symbol),
    };
  },
};

