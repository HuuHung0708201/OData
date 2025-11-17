import Formatter from "base/utils/Formatter";
import type ResourceBundle from "sap/base/i18n/ResourceBundle";
import type Control from "sap/ui/core/Control";
import UI5Element from "sap/ui/core/Element";
import Controller from "sap/ui/core/mvc/Controller";
import type View from "sap/ui/core/mvc/View";
import syncStyleClass from "sap/ui/core/syncStyleClass";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import Model from "sap/ui/model/Model";
import type ODataModel from "sap/ui/model/odata/v2/ODataModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import type Component from "../Component";

/**
 * @namespace base.controller
 */
export default class Base extends Controller {
  public formatter = Formatter;
  public dataType = {};

  protected getRouter() {
    return UIComponent.getRouterFor(this);
  }

  protected getModel<T = JSONModel>(name?: string) {
    return this.getView()?.getModel(name) as T;
  }

  protected setModel(model: Model, name?: string) {
    this.getView()?.setModel(model, name);
  }

  protected getGlobalModel() {
    return this.getComponentModel("global");
  }

  protected getControlById<T = UI5Element>(id: string) {
    return this.getView()?.byId(id) as T;
  }

  protected getControlId<T = string>(control: UI5Element): T;
  // eslint-disable-next-line no-dupe-class-members
  protected getControlId<T = string | null>(control?: UI5Element): T;
  // eslint-disable-next-line no-dupe-class-members
  protected getControlId<T = string | null>(control?: UI5Element) {
    if (!control) return null;
    return this.getView()?.getLocalId(control.getId()) as T;
  }

  protected reload() {
    // eslint-disable-next-line fiori-custom/sap-no-location-reload
    window.location.reload();
  }

  protected getResourceBundle() {
    const resourceModel = <ResourceModel>this.getComponent().getModel("i18n");
    return <ResourceBundle>resourceModel.getResourceBundle();
  }

  protected getBundleText(i18nKey: string, placeholders?: string[]) {
    return this.getResourceBundle().getText(i18nKey, placeholders) || i18nKey;
  }

  protected getComponent() {
    return this.getOwnerComponent() as Component;
  }

  protected getComponentModel<T = ODataModel>(name?: string) {
    return this.getComponent().getModel(name) as T;
  }

  protected setComponentModel(model: Model, name?: string) {
    this.getComponent().setModel(model, name);
  }

  protected getMetadataLoaded() {
    return this.getComponentModel().metadataLoaded();
  }

  protected attachControl(control: Control) {
    const view = <View>this.getView();

    const styleClass = this.getComponent().getContentDensityClass();

    syncStyleClass(styleClass, view, control);

    view.addDependent(control);
  }

  protected async loadView<T extends Control>(viewName: string) {
    const fragment = <Promise<T>>this.loadFragment({
      name: `${this.getAppID()}.view.fragments.${viewName}`,
    });

    fragment
      .then((control) => {
        this.attachControl(control);
      })
      .catch((error) => {
        console.log(error);
      });

    return fragment;
  }

  protected getAppID() {
    return <string>this.getComponent().getManifestEntry("/sap.app/id");
  }

  protected getControlName<T extends Control>(control: T): string {
    return control.getMetadata().getName();
  }

  protected isControl<T extends Control>(control: unknown, name: string): control is T {
    return this.getControlName(<Control>control) === name;
  }

  protected displayTarget(options: { target: string; title?: string; description?: string }) {
    const { target, title, description } = options;

    void this.getRouter().getTargets()?.display(target);
  }
}
