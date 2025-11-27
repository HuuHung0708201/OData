import type { FilterPayload } from "base/types/filter";
import type { ODataError, ODataResponse } from "base/types/odata";
import type { FieldValueHelpItem, LeaveRequestForm, LeaveRequestItem } from "base/types/pages/main";
import type { Dict } from "base/types/utils";
import { noop, sleep } from "base/utils/shared";
import DynamicPage from "sap/f/DynamicPage";
import type { Button$PressEvent } from "sap/m/Button";
import ComboBox from "sap/m/ComboBox";
import DatePicker from "sap/m/DatePicker";
import type Dialog from "sap/m/Dialog";
import type { Dialog$AfterCloseEvent } from "sap/m/Dialog";
import type Input from "sap/m/Input";
import Label from "sap/m/Label";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import MultiComboBox from "sap/m/MultiComboBox";
import MultiInput from "sap/m/MultiInput";
import type { RadioButtonGroup$SelectEvent } from "sap/m/RadioButtonGroup";
import Select from "sap/m/Select";
import TextArea from "sap/m/TextArea";
import TimePicker from "sap/m/TimePicker";
import Token from "sap/m/Token";
import FilterBar from "sap/ui/comp/filterbar/FilterBar";
import type { FilterBar$FilterChangeEvent } from "sap/ui/comp/filterbar/FilterBar";
import FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
import { ValueState } from "sap/ui/core/library";
import type View from "sap/ui/core/mvc/View";
import type { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import type Router from "sap/ui/core/routing/Router";
import type Context from "sap/ui/model/Context";
import JSONModel from "sap/ui/model/json/JSONModel";
import type ODataModel from "sap/ui/model/odata/v2/ODataModel";
import Table from "sap/ui/table/Table";
import Base from "./Base.controller";
import DateFormat from "sap/ui/core/format/DateFormat";
import InputBase from "sap/m/InputBase";
import type Event from "sap/ui/base/Event";
import MessagePopover from "sap/m/MessagePopover";
import Core from "sap/ui/core/Core";
import MessageItem from "sap/m/MessageItem";
import Element1 from "sap/ui/mdc/Element";
import type Message from "sap/ui/core/message/Message";
import type Control from "sap/ui/core/Control";
import type Button from "sap/m/Button";
import {ButtonType} from "sap/m/library";
import type Model from "sap/ui/model/Model";
/**
 * @namespace base.controller
 */
export default class Main extends Base {
  private view: View | undefined;
  private router: Router;
  private table: Table;
  private layout: DynamicPage;

  // Filters
  private svm: SmartVariantManagement;
  private expandedLabel: Label;
  private snappedLabel: Label;
  private filterBar: FilterBar;

  // Fragments
  private createRequestDiglog: Dialog;
  private editRequestDiglog: Dialog;

  private dateRangePickers: DatePicker[] = [];

  // Format
  private messageManager!: any;
  private MP!: MessagePopover; // MessagePopover instance
  private createDialog: Promise<any>;
  private mangBatBuoc: boolean[] = [];

  public override onInit(): void {
    this.view = <View>this.getView();
    this.router = this.getRouter();
    this.table = this.getControlById<Table>("table");
    this.layout = this.getControlById<DynamicPage>("dynamicPage");

    this.setModel(
      new JSONModel({
        rows: [],
        selectedIndices: []
      }),
      "table"
    );

    this.setModel(
      new JSONModel({
        Status: [],
        LeaveType: [],
        TimeSlot: [],
      }),
      "master"
    );

    // Bộ lọc
    this.svm = this.getControlById<SmartVariantManagement>("svm");
    this.expandedLabel = this.getControlById<Label>("expandedLabel");
    this.snappedLabel = this.getControlById<Label>("snappedLabel");
    this.filterBar = this.getControlById<FilterBar>("filterBar");

    // Khởi tạo bộ lọc
    this.filterBar.registerFetchData(this.fetchData);
    this.filterBar.registerApplyData(this.applyData);
    this.filterBar.registerGetFiltersWithValues(this.getFiltersWithValues);

    this.svm.addPersonalizableControl(
      new PersonalizableInfo({
        type: "filterBar",
        keyName: "table",
        dataSource: "",
        control: this.filterBar,
      })
    );
    this.svm.initialise(noop, this.filterBar);

    // Router
    this.router.getRoute("RouteMain")?.attachMatched(this.onObjectMatched);
  }

  // #region Lifecycle hook
  public override onAfterRendering(): void | undefined {}

  public override onExit(): void | undefined {
    this.router.getRoute("RouteMain")?.detachMatched(this.onObjectMatched);
  }
  // #endregion Lifecycle hook

  // #region Router
  private onObjectMatched = (event: Route$MatchedEvent) => {
    this.getMetadataLoaded()
      .then(() => this.onGetMasterData())
      .then (()=> {
        this.filterBar.fireSearch();
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        // loading off
      });
  };
  // #endregion Router

  // #region Filters
  // Lấy các giá trị trường để tạo biến thể bộ lọc mới
  private fetchData = () => {
    return this.filterBar.getAllFilterItems(false).reduce<FilterPayload[]>((acc, item: FilterGroupItem) => {
      const control = item.getControl();
      const groupName = item.getGroupName();
      const fieldName = item.getName();

      if (control) {
        let fieldData: string | string[] = "";

        switch (true) {
          case this.isControl<Input>(control, "sap.m.Input"):
          case this.isControl<TextArea>(control, "sap.m.TextArea"): {
            fieldData = control.getValue();

            break;
          }
          case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
            fieldData = control.getTokens().map((token) => token.getKey());

            break;
          }
          case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
          case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
            fieldData = control.getValue();

            break;
          }
          case this.isControl<Select>(control, "sap.m.Select"):
          case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
            fieldData = control.getSelectedKey();

            break;
          }
          case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
            fieldData = control.getSelectedKeys();

            break;
          }
          default:
            break;
        }

        acc.push({
          groupName,
          fieldName,
          fieldData,
        });
      }

      return acc;
    }, []);
  };

  // Áp dụng các giá trị trường từ biến thể bộ lọc
  private applyData = (data: unknown) => {
    (<FilterPayload[]>data).forEach((item) => {
      const { groupName, fieldName, fieldData } = item;

      const control = this.filterBar.determineControlByName(fieldName, groupName);

      switch (true) {
          case this.isControl<Input>(control, "sap.m.Input"):
          case this.isControl<TextArea>(control, "sap.m.TextArea"): {
            control.setValue(<string>fieldData);

            break;
          }
          case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
            const tokens = (<string[]>fieldData).map((key) => new Token({key, text: key}));

            control.setTokens(tokens);

            break;
          }
          case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
          case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
            control.setValue(<string>fieldData);

            break;
          }
          case this.isControl<Select>(control, "sap.m.Select"):
          case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
            control.setSelectedKey(<string>fieldData);

            break;
          }
          case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
            control.setSelectedKeys(<string[]>fieldData);

            break;
          }
          default:
            break;
        }
    });
  };

  // Lấy các bộ lọc có giá trị để hiển thị trong nhãn
  private getFiltersWithValues = () => {
    return this.filterBar.getFilterGroupItems().reduce<FilterGroupItem[]>((acc, item) => {
      const control = item.getControl();

      if (control) {
        switch (true) {
          case this.isControl<Input>(control, "sap.m.Input"):
          case this.isControl<TextArea>(control, "sap.m.TextArea"): {
            const value = control.getValue();

            if (value) {
              acc.push(item);
            }

            break;
          }
          case this.isControl<MultiInput>(control, "sap.m.MultiInput"): {
            const tokens = control.getTokens();

            if (tokens.length) {
              acc.push(item);
            }

            break;
          }
          case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
          case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
            const value = control.getValue();

            if (value) {
              acc.push(item);
            }

            break;
          }
          case this.isControl<Select>(control, "sap.m.Select"):
          case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
            const value = control.getSelectedKey();

            if (value) {
              acc.push(item);
            }

            break;
          }
          case this.isControl<MultiComboBox>(control, "sap.m.MultiComboBox"): {
            const keys = control.getSelectedKeys();

            if (keys.length){
              acc.push(item);
            }

            break;
          }
          default:
            break;
        }
      }

      return acc;
    }, []);
  };

  public onSelectionChange (event: FilterBar$FilterChangeEvent) {
    this.svm.currentVariantSetModified(true);
    this.filterBar.fireEvent("filterChange", event);
  }

  public onFilterChange() {
    this.updateLabelsAndTable();
  }

  public onAfterVariantLoad() {
    this.updateLabelsAndTable();
  }

  private updateLabelsAndTable() {
    const expandedLabel = this.filterBar.retrieveFiltersWithValuesAsTextExpanded();
    const snappedLabel = this.filterBar.retrieveFiltersWithValuesAsText();

    this.expandedLabel.setText(expandedLabel);
    this.snappedLabel.setText(snappedLabel);

    // this.table.setShowOverlay(true);
  }

  public getFilters() {
    const filters = this.filterBar.getFilterGroupItems().reduce<Dict>((acc, item) => {
      const control = item.getControl();
      const name = item.getName();

      switch (true) {
        case this.isControl<Input>(control, "sap.m.Input"):
        case this.isControl<TextArea>(control, "sap.m.TextArea"): {
          const value = control.getValue();

          if (value) {
            acc[name] = value;
          }

          break;
        }
        case this.isControl<DatePicker>(control, "sap.m.DatePicker"):
        case this.isControl<TimePicker>(control, "sap.m.TimePicker"): {
          const value = control.getValue();

          if (value) {
            acc[name] = value;
          }

          break;
        }
        case this.isControl<Select>(control, "sap.m.Select"):
        case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
          const value = control.getSelectedKey();

          if (value) {
            acc[name] = value;
          }

          break;
        }
        default:
          break;
      }

      return acc;
    }, {});

    console.log("Filters:", filters);

    return filters;
  }
  // #endregion Filters

  public onSearch() {
    const oDataModel = this.getModel<ODataModel>();
    const tableModel = this.getModel<JSONModel>("table");

    this.table.setBusy(true);
    oDataModel.read("/LeaveRequestSet", {
      filters: [],
      urlParameters: {},
      success: (response: ODataResponse<LeaveRequestItem[]>) => {
        this.table.setBusy(false);

        console.log("OData read success:", response.results);

        tableModel.setProperty("/rows", response.results);
      },
      error: (error: ODataError) => {
        this.table.setBusy(false);
        console.error("OData read error:", error);
      },
    });
  }

  private onRefresh() {
    this.filterBar.fireSearch();
  }

  public onSearchLegacy() {
    const tableModel = this.getModel<JSONModel>("table");

    this.table.setBusy(true);

    sleep(2000)
      .then(() => {
        const mockData: LeaveRequestItem[] = [
          {
            CreatedAt: new Date(),
            Reason: "Vacation",
            RequestId: "REQ-001",
            CreatedBy: "John Doe",
            EmployeeId: "EMP-001",
            LeaveType: "Annual Leave",
            StartDate: "2024-07-01",
            EndDate: "2024-07-10",
            Status: "Approved",
            TimeSlot: "Full Day",
          },
          {
            CreatedAt: new Date(),
            Reason: "Medical Leave",
            RequestId: "REQ-002",
            CreatedBy: "Jane Smith",
            EmployeeId: "EMP-002",
            LeaveType: "Sick Leave",
            StartDate: "2024-08-15",
            EndDate: "2024-08-20",
            Status: "Pending",
            TimeSlot: "Half Day",
          },
        ];

        this.table.setBusy(false);
        tableModel.setProperty("/rows", mockData);

        console.log("Data fetch successful:", mockData);
      })
      .catch((error) => {
        this.table.setBusy(false);
        console.error("Error during data fetch:", error);
      });
  }

  // #region Table
  public onRowSelectionChange() {
    const selectedIndices = this.table.getSelectedIndices();

    const tableModel = this.getModel<JSONModel>("table");

    tableModel.setProperty("/selectedIndices", [...selectedIndices]);
    // tableModel.setProperty("/selectedIndices", selectedIndices);
  }
  // #endregion Table

  // #region Event handlers
  // #region Create
  public async onOpenCreateRequest() {
    try {
      if (!this.createRequestDiglog) {
        this.createRequestDiglog = await this.loadView<Dialog>("CreateRequest");
      }

      this.createRequestDiglog.setModel(
        new JSONModel({
          LeaveType: "",
          StartDate: "",
          EndDate: "",
          Reason: "",
          TimeSlot: "",
          TimeSlotIndex: 0,
        } satisfies LeaveRequestForm),
        "form"
      );

      this.createRequestDiglog.open();

      this.HamFormatLogThongBao();
    } catch (error) {
      console.log(error);
    }
  }

  public onCloseCreateRequest() {
    this.createRequestDiglog?.close();
  }

  public onAfterCloseCreateRequest(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();

    dialog.setModel(null, "form");
  }

  public onSubmitCreateRequest(event: Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    const formData = <LeaveRequestForm>formModel.getData();

    const oDataModel = this.getModel<ODataModel>();

    const isValid = this.onValidateBeforeSubmit();

    this.dateRangePickers = [];

    // Format cảnh báo - Start
    this.mangBatBuoc = [];

    let buttonCanhBao = this.getControlById<Button>("messagePopoverBtn");

    buttonCanhBao.setVisible(true);

    // Format cảnh báo - End

    if (!isValid) {
      return;
    }

    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    dialog.setBusy(true);
    oDataModel.create(
      "/LeaveRequestSet",
      {
        LeaveType,
        StartDate: this.formatter.toUTCDate(StartDate),
        EndDate: this.formatter.toUTCDate(EndDate),
        Reason,
        TimeSlot: "01",
        Status: "01", // New
      },
      {
        success: (response: ODataResponse<LeaveRequestItem>) => {
          dialog.setBusy(false);

          MessageToast.show("Leave request created successfully.");

          this.onCloseCreateRequest();

          this.onRefresh();
        },
        error: (error: ODataError) => {
          dialog.setBusy(false);
        },
      }
    );
  }
  // #endregion Create

  // #region Edit
  public async onOpenEditRequest () {
    try {
      const indices = this.table.getSelectedIndices();

      if (!indices.length) {
        MessageToast.show("Please select at least one request to delete.");
        return;
      }

      const item = <LeaveRequestItem>this.table.getContextByIndex(indices[0])?.getObject();

      if (!item) return;

      console.log(item)

      if (!this.editRequestDiglog) {
        this.editRequestDiglog = await this.loadView<Dialog>("EditRequest");
      }

      const oDateFormat = DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });

      this.editRequestDiglog.setModel(
        new JSONModel({
          LeaveType: item.LeaveType,
          StartDate: oDateFormat.format(new Date(item.StartDate)),
          EndDate: oDateFormat.format(new Date(item.EndDate)),
          Reason: item.Reason,
          TimeSlot: item.TimeSlot,
          TimeSlotIndex: 0,
        } satisfies LeaveRequestForm),
        "form"
      );

      this.editRequestDiglog.open();
    } catch (error) {
      console.log(error);
    }
  }

  public onCloseEditRequest() {
    this.editRequestDiglog?.close();
  }

  public onAfterCloseEditRequest(event: Dialog$AfterCloseEvent) {
    const dialog = event.getSource();

    dialog.setModel(null, "form");
  }

  public onSubmitEditRequest(event: Button$PressEvent) {
    const control = event.getSource();
    const dialog = <Dialog>control.getParent();

    const formModel = <JSONModel>dialog.getModel("form");
    
    const formData = <LeaveRequestForm>formModel.getData();

    const oDataModel = this.getModel<ODataModel>();

    const { LeaveType, StartDate, EndDate, Reason, TimeSlot } = formData;

    const indices = this.table.getSelectedIndices();

    const item = <LeaveRequestItem>this.table.getContextByIndex(indices[0])?.getObject();

    const key = oDataModel.createKey("/LeaveRequestSet", item);

    const isValid = this.onValidateBeforeSubmit();

    this.dateRangePickers = [];

    if (!isValid) {
      return;
    }

    dialog.setBusy(true);
    oDataModel.update(
      key,
      {
        LeaveType,
        StartDate: this.formatter.toUTCDate(StartDate),
        EndDate: this.formatter.toUTCDate(EndDate),
        Reason,
        TimeSlot: "01",
        Status: "01", // New
      },
      {
        success: (response: ODataResponse<LeaveRequestItem>) => {
          dialog.setBusy(false);

          MessageToast.show("Leave request edit successfully.");

          this.onCloseEditRequest();

          this.onRefresh();
        },
        error: (error: ODataError) => {
          dialog.setBusy(false);
        },
      }
    );
  }
  // #endregion Edit

  // #region Delete
  public onDeleteRequest() {
    const oDataModel = this.getModel<ODataModel>();

    const indices = this.table.getSelectedIndices();

    if (!indices.length) {
      MessageToast.show("Please select at least one request to delete.");
      return;
    }

    const item = <LeaveRequestItem>this.table.getContextByIndex(indices[0])?.getObject();

    MessageBox.confirm("Do you want to delete this request?", {
      actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
      emphasizedAction: MessageBox.Action.DELETE,
      onClose: (action: unknown) => {
        if (action === MessageBox.Action.DELETE) {
          const key = oDataModel.createKey("/LeaveRequestSet", item);

          oDataModel.remove(key, {
            success: () => {
              MessageToast.show("Leave request deleted successfully.");

              this.onRefresh();
            },
            error: (error: ODataError) => {
              console.log(error);
              MessageBox.error("Failed to delete the leave request.");
            },
          });
        }
      },
    });
  }
  // #endregion Delete
  // #endregion Event handlers

  // #region Validation

  public onChangeValue (event: Event) {
    try {
      const control = event.getSource<InputBase>();

      if (control.getVisible()) {
        this.validateControl(control);
      }
    } catch (error) {
      console.log(error);
    }
  }

  private onValidateBeforeSubmit() {
    const controls = this.getFormControlsByFieldGroup<InputBase>({
      groupId: "FormField",
      container: this.createRequestDiglog,
    });

    const isValid = this.validateControls(controls);

    if (isValid) {
      return true;
    } else {
      return false;
    }
  }

  private validateControls (controls: InputBase[]) {
    let isValid = false;
    let isError = false;

    controls.forEach((control) => {
      isError = this.validateControl(control);

      isValid = isValid || isError;
    });

    return !isValid;
  }

  private validateControl (control: InputBase): boolean {
    let isError = false;

    this.setMessageState(control, {
      message: "",
      severity: "None",
    });

    let requiredError = false;
    let outOfRangeError = false;
    let dataRangeError = false;
    let soSanhNgayHienTai = false;

    let value: string = "";

    const today = new Date();
    today.setHours(0,0,0,0);

    switch (true) {
      case this.isControl<Input>(control, "sap.m.Input"): {
        value = control.getValue().trim();

        if (!value && control.getRequired()) {
          requiredError = true;
        }

        break;
      }
      case this.isControl<TextArea>(control, "sap.m.TextArea"): {
        value = control.getValue().trim();

        if (!value && control.getRequired()) {
          requiredError = true;
        }

        break;
      }
      case this.isControl<DatePicker>(control, "sap.m.DatePicker"): {
        value = control.getValue();

        if (!value && control.getRequired()) {
          requiredError = true;
        } else if (value && !control.isValidValue()) {
          outOfRangeError = true;
        } else if (value && control.isValidValue()) {
          const existingIndex = this.dateRangePickers.findIndex(
            dp => dp.getId() === control.getId()
          );

          if (existingIndex !== -1) {
          // Thay thế control cũ
            this.dateRangePickers[existingIndex] = control;
          } else {
            // Thêm mới nếu chưa có
            this.dateRangePickers.push(control);
          }

          if (this.dateRangePickers.length !== 2) return true;

          const tuNgay = this.dateRangePickers[0].getDateValue();
          const denNgay = this.dateRangePickers[1].getDateValue();

          if (tuNgay > denNgay) {
            dataRangeError = true;
          }

          if (tuNgay < today) {
            soSanhNgayHienTai = true; // hoặc tạo flag riêng nếu muốn
          } else if (denNgay < today) {
            soSanhNgayHienTai = true; // hoặc tạo flag riêng nếu muốn
          }
        }

        break;
      }
      case this.isControl<ComboBox>(control, "sap.m.ComboBox"): {
        value = control.getSelectedKey();

        const input = control.getValue().trim();

        if (!value && input) {
          outOfRangeError = true;
        } else if (!value && control.getRequired()) {
          requiredError = true;
        }

        break;
      }
      default: 
        break;
    }

    // Format mới - Start
    this.buttonIconFormatter(requiredError);
    this.buttonTypeFormatter(requiredError);
    this.highestSeverityMessages(requiredError);
    // Format mới - End

    if (requiredError) {
      this.setMessageState(control, {
        message: "Trường bắt buộc",
        severity: "Error",
      });

      isError = true;
    } else if (dataRangeError) {
      this.setMessageState(control, {
        message: "Từ ngày <= Đến ngày",
        severity: "Error",
      });

      isError = true;
    } else if (outOfRangeError) {
      this.setMessageState(control, {
        message: "Dữ liệu nhập không hợp lệ.",
        severity: "Error",
      });

      isError = true;
    } else if (soSanhNgayHienTai) {
      this.setMessageState(control, {
        message: "Ngày đăng ký phải >= ngày hiện tại.",
        severity: "Error",
      });

      isError = true;
    }

    return isError;
  }

  private setMessageState (control: InputBase, 
    options: {
      message: string;
      severity: keyof typeof ValueState;
    }
  ) {
    const {message, severity} = options;

    control.setValueState(severity);
    control.setValueStateText?.(message);
  }

  public onRadioSelectionChange(event: RadioButtonGroup$SelectEvent) {
    const control = event.getSource();

    const context = <Context>control.getBindingContext("form");
    const formModel = <JSONModel>context.getModel();
    const path = context.getPath();

    const selectedIndex = control.getSelectedIndex();

    const options = <FieldValueHelpItem[]>this.getModel("master").getProperty("/TimeSlot");

    const { FieldKey } = options[selectedIndex];

    formModel.setProperty(`${path}/TimeSlot`, FieldKey);
  }
  // #endregion Validation

  // #region Formatters
  public formatStatusText(statusKey: string): string {
    const map: Record<string, string> = {
      "01": "New",
      "02": "Approved",
      "03": "Rejected",
    };
    return map[statusKey] ?? statusKey;
  }

  public formatStatusState(statusKey: string): ValueState {
    const map: Record<string, ValueState> = {
      "01": ValueState.Information,
      "02": ValueState.Success,
      "03": ValueState.Error,
    };
    return map[statusKey] ?? ValueState.None;
  }
  // #endregion Formatters

  // #region Master data
  private async onGetMasterData() {
    return new Promise((resolve, reject) => {
      const oDataModel = this.getModel<ODataModel>();
      const masterModel = this.getModel("master");

      oDataModel.read("/FieldValueHelpSet", {
        success: (response: ODataResponse<FieldValueHelpItem[]>) => {
          console.log("Raw FieldValueHelpSet data:", response.results);

          const status: FieldValueHelpItem[] = [];
          const leaveType: FieldValueHelpItem[] = [];
          const timeSlot: FieldValueHelpItem[] = [];

          response.results.forEach((item) => {
            switch (item.FieldName) {
              case "Status": {
                status.push(item);
                break;
              }
              case "LeaveType": {
                leaveType.push(item);
                break;
              }
              case "TimeSlot": {
                timeSlot.push(item);
                break;
              }
              default:
                break;
            }
          });

          masterModel.setProperty("/Status", status);
          masterModel.setProperty("/LeaveType", leaveType);
          masterModel.setProperty("/TimeSlot", timeSlot);

          console.log("Master data loaded:", masterModel.getData());

          resolve(true);
        },
        error: (error: ODataError) => {
          reject(error);
        },
      });
    });
  }
  // #endregion Master data

  // #region Format theo cảnh báo lỗi
  public HamFormatLogThongBao(): void {
    this.messageManager = Core.getMessageManager();

    this.messageManager.removeAllMessages();

    this.messageManager.registerObject(this.view?.byId("createRequestDialog"), true);

    this.view?.setModel(this.messageManager.getMessageModel(), "message");

    this.createMessagePopover();
  }

  // Tạo MessagePopover và gán behavior khi click vào message
  private createMessagePopover(): void {
    this.MP = new MessagePopover({
        items: {
            path: "message>/",

            template: new MessageItem({
                title: "{message>message}",

                subtitle: "{message>additionalText}",

                groupName: { parts: [{ path: 'message>controlIds' }], formatter: this.getGroupName.bind(this) },

                // activeTitle: { parts: [{ path: 'message>controlIds' }], formatter: this.isPositionable.bind(this) },

                type: "{message>type}",

                description: "{message>message}"
            })
        },

        groupItems: true
    });

    // Gắn MessagePopover vào nút trong Dialog
    const oButton: any = this.view?.byId("messagePopoverBtn");

    oButton.addDependent(this.MP);
  }

  // Tạo nhóm (group) cho các MessageItem trong MessagePopover
  public getGroupName(controlId: string): string | undefined {
    // Lấy control từ registry
    const control = <Control | undefined>Element1.registry.get(controlId);

    if (!control) {
        return;
    }

    // Điều hướng lên parent theo đúng cấu trúc layout của bạn
    const parent1 = control.getParent();                      // Ví dụ: FormElement
    const parent2 = parent1?.getParent();                      // Ví dụ: FormContainer
    const parent3 = parent2?.getParent();                      // Ví dụ: Form

    const formSubtitle =(parent2 as any)?.getTitle?.()?.getText?.() ?? "";
    const formTitle = (parent3 as any)?.getTitle?.() ?? "";

    return `${formTitle}, ${formSubtitle}`;
  }

  // Điều hướng tới (scroll vào view) khi người dùng bấm vào lỗi
  public isPositionable(controlId: string | undefined): boolean {
    if (!controlId) {
        return false;
    }

    const control = Element1.registry.get(controlId);

    // Nếu control tồn tại và có trong DOM, cho phép navigate
    return !!(control && control.getDomRef());
  }

  // Format type button - Start
  public buttonTypeFormatter(requiredError: boolean): ButtonType {
    let highestSeverity: ButtonType = ButtonType.Transparent;

    if (requiredError) {
      highestSeverity = ButtonType.Reject;
    } else {
      highestSeverity = ButtonType.Transparent;
    }

    return highestSeverity;
  }

  // Format type button - End

  // Lấy số lượng - Start
  public highestSeverityMessages(requiredError: boolean): string {
    // Lấy loại severity button cao nhất từ formatter
    const highestSeverityButtonType = this.buttonTypeFormatter(requiredError);

    // Map ButtonType mới sang Message type
    let highestSeverityMessageType: string;

    switch (highestSeverityButtonType) {
        case ButtonType.Reject: {
          highestSeverityMessageType = "Error";

          break;
        }   
        case ButtonType.Attention: {
          highestSeverityMessageType = "Warning";

          break;
        }
        case ButtonType.Accept: {
          highestSeverityMessageType = "Success";

          break;
        }
        default: {
          highestSeverityMessageType = "Information";

          break;
        }
    }

    // Đếm số message có type = highestSeverityMessageType
    this.mangBatBuoc.push(requiredError);

    let dem = "4"; //demSoLuong > 0 ? String(demSoLuong) : "";

    // Trả về số lượng dưới dạng string, hoặc "" nếu = 0
    // return demSoLuong > 0 ? String(demSoLuong) : "";
    return dem;
  }
  // Lấy số lượng - End

  // Format icon - Start
  public buttonIconFormatter(requiredError: boolean): string {
    let icon: string | undefined;

    if (requiredError) {
      icon = "sap-icon://error";
    } else {
      icon = "sap-icon://information";
    }


    return icon ?? "sap-icon://information";
  }

  // Format icon - End

  // Khi click vào btn - Start
  public handleMessagePopoverPress(event: Event): void {
    const oButton = event.getSource() as any;

    if (!this.MP) {
        this.createMessagePopover();
    }

    // MessagePopover mở ra ở dưới nút
    this.MP.toggle(oButton);

    // Force bottom alignment bằng CSS (nếu muốn)
    // const $pop = this.MP.$(); // jQuery element của MessagePopover
    // if ($pop) {
    //     $pop.css({
    //         top: `${oButton.getDomRef().getBoundingClientRect().bottom + 1}px`,
    //         left: `${oButton.getDomRef().getBoundingClientRect().left}px`
    //     });
    // }
  }
  // Khi click vào btn - End

  // #endregion

}
