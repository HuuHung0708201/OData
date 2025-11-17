import type FlexibleColumnLayout from "sap/f/FlexibleColumnLayout";
import FlexibleColumnLayoutSemanticHelper from "sap/f/FlexibleColumnLayoutSemanticHelper";
import { LayoutType } from "sap/f/library";
import type Control from "sap/ui/core/Control";
import View from "sap/ui/core/mvc/View";
import BaseComponent from "sap/ui/core/UIComponent";
import Device from "sap/ui/Device";
import JSONModel from "sap/ui/model/json/JSONModel";
import { createDeviceModel } from "./model/models";
import type { ComponentData, Dict } from "./types/utils";

/**
 * @namespace base
 */
export default class Component extends BaseComponent {
  public static metadata = {
    manifest: "json",
    interfaces: ["sap.ui.core.IAsyncContentCreation"],
  };

  public override init(): void {
    // call the base component's init function
    super.init();

    this.setModel(
      new JSONModel({
        MessageTitle: "",
        MessageDescription: "",
      }),
      "global"
    );

    // set the device model
    this.setModel(createDeviceModel(), "device");

    // enable routing
    this.getRouter().initialize();
  }

  // Initialize the application asynchronously
  // It makes the application a lot faster and, through that, better to use.
  public override createContent(): Control | Promise<Control | null> | null {
    const appView = View.create({
      viewName: `${this.getAppID()}.view.App`,
      type: "XML",
      viewData: { component: this },
    });

    appView
      .then((view) => {
        view.addStyleClass(this.getContentDensityClass());
      })
      .catch((error) => {
        console.log(error);
      });

    return appView;
  }

  public getAppID() {
    return <string>this.getManifestEntry("/sap.app/id");
  }

  public getContentDensityClass(): string {
    return Device.support.touch ? "sapUiSizeCozy" : "sapUiSizeCompact";
  }

  public getStartupParameters() {
    if (!this.getComponentData()) {
      return {};
    }

    const parameters = (<ComponentData>this.getComponentData()).startupParameters;

    const values = Object.keys(parameters).reduce<Dict>((acc, key) => {
      acc[key] = parameters[key][0];
      return acc;
    }, {});

    return values;
  }

  public getFCLHelper() {
    const fcl = <FlexibleColumnLayout>(<View>this.getRootControl()).byId("fcl");

    return FlexibleColumnLayoutSemanticHelper.getInstanceFor(fcl, {
      defaultTwoColumnLayoutType: LayoutType.TwoColumnsMidExpanded,
      defaultThreeColumnLayoutType: LayoutType.ThreeColumnsMidExpanded,
      maxColumnsCount: 2,
    });
  }
}
