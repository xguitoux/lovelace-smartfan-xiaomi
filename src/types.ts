import { LovelaceCard, LovelaceCardEditor } from "custom-card-helpers";

declare global {
  interface HTMLElementTagNameMap {
    "smartfan-xiaomi-card-editor": LovelaceCardEditor;
    "hui-error-card": LovelaceCard;
  }
}
