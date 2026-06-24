/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, CSSResultGroup } from "lit";
import { HomeAssistant, fireEvent, LovelaceCardEditor } from "custom-card-helpers";

import { customElement, property, state } from "lit/decorators";
import { defaultConfig, FanXiaomiCardConfig, platforms } from "./config";

const SCHEMA = [
  { name: "name", selector: { text: {} } },
  {
    name: "platform",
    selector: {
      select: {
        mode: "dropdown",
        options: platforms.map((platform) => ({ value: platform, label: platform })),
      },
    },
  },
  { name: "entity", selector: { entity: { domain: "fan" } } },
  { name: "force_sleep_mode_support", selector: { boolean: {} } },
  { name: "hide_led_button", selector: { boolean: {} } },
] as const;

const LABELS: Record<string, string> = {
  name: "Name (Optional)",
  platform: "Platform (Required)",
  entity: "Entity (Required)",
  force_sleep_mode_support: "Show sleep mode button",
  hide_led_button: "Hide LED button (for supported devices)",
};

@customElement("smartfan-xiaomi-card-editor")
export class FanXiaomiCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private config: Partial<FanXiaomiCardConfig> = {};

  public setConfig(config: FanXiaomiCardConfig): void {
    this.config = config;
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    const data = {
      ...defaultConfig,
      ...this.config,
    };

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _computeLabel = (schema: { name: string }): string => LABELS[schema.name] ?? schema.name;

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this.config || !this.hass) {
      return;
    }

    const config: Partial<FanXiaomiCardConfig> = { ...ev.detail.value };

    // To keep the yaml clean, drop any values that match the defaults.
    for (const key of Object.keys(defaultConfig)) {
      if (config[key] === defaultConfig[key]) {
        delete config[key];
      }
    }

    this.config = config;
    fireEvent(this, "config-changed", { config });
  }

  static styles: CSSResultGroup = css`
    ha-form {
      display: block;
    }
  `;
}
