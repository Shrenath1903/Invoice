var invoiceRef
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
    "./validation",
], (Controller, JSONModel, MessageBox, validation) => {
    "use strict";

    return Controller.extend("invoiceapp.controller.edit", {
        onInit(oEvent) {
            invoiceRef = this
            var invoiceModel = new JSONModel
            this.getView().setModel(invoiceModel, "invoiceModel");
            var invoiceItemModel = new JSONModel
            this.getView().setModel(invoiceItemModel, "invoiceItemModel");
            var visibilityModel = new JSONModel
            this.getView().setModel(visibilityModel, "visibilityModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("edit").attachPatternMatched(this._onObjectMatched, this);

            // this.onNumbervalidation(oEvent)
        },
        onNumbervalidation : function(oEvent) {
            validateNumber (oEvent);
         },

        _onObjectMatched: function (oEvent) {
            var argument = oEvent.getParameter("arguments")
            var visibilityModel = this.getView().getModel("visibilityModel")

            if (argument.po_no != "temp") {
                visibilityModel.setProperty("/v_local", false)
                visibilityModel.setProperty("/v_db", true)
                this.po_no = argument.po_no;
                this.loadData(this.po_no);
            }
            else {
                visibilityModel.setProperty("/v_local", true)
                visibilityModel.setProperty("/v_db", false)
            }
        },
        loadData: function (po_no) {
            var invoiceModel = this.getView().getModel("invoiceModel")
            var oDataModel = this.getView().getModel();
            var path = `/Invoice(po_no=${po_no})`
            oDataModel.read(path, {
                urlParameters: { "$expand": "Items" },
                success: function (oData, response) {
                    var test = oData
                    if (oData.Items) {
                        invoiceRef.loadInvoiceItemModel(oData)
                    }
                    invoiceModel.setData(oData)

                    console.log(test)

                },
                error: function (error) {
                    // Handle error if the PDF could not be retrieved
                    sap.m.MessageToast.show("Error downloading PDF");
                    console.error("Error downloading PDF:", error);
                }
            });

        },
        loadInvoiceItemModel: function (oData) {
            var items = oData.Items.results
            var invoiceItemModel = this.getView().getModel("invoiceItemModel")
            invoiceItemModel.setData({ invoiceItems: items })
            console.log(invoiceItemModel);

        },
        updateInvoice: function () {
            var invoiceModel = this.getView().getModel("invoiceModel")
            var payload = invoiceModel.oData;
            delete payload.createdBy;
            delete payload.createdAt;
            console.log(payload)
            var path = `/Invoice(po_no=${this.po_no})`;
            var oDataModel = this.getView().getModel();

            oDataModel.update(path, payload, {
                success: function (data, response) {
                    MessageBox.success("Successfully Updated");
                },
                error: function (error) {
                    MessageBox.error("Error while updating the data");
                }
            });
        },
        onDownloadPDF: function (po_no_t) {
            if (po_no_t && po_no_t.getParameter) {
                var po_no = this.po_no
            }
            else {
                var po_no = po_no_t
            }
            var sPath = `/PDFEntity(po_no=${po_no})`;

            var sServiceUrl = this.getView().getModel().sServiceUrl;
            var sParsedServiceUrl = sServiceUrl.indexOf("/") === 2 ? sServiceUrl.substring(2) : sServiceUrl;
            var sUrl = sParsedServiceUrl + sPath + "/pdf";
            window.open(sUrl, '_blank');
        },

        //   offline 

        downloadInvoice: function (oEvent) {
            var invoiceModel = this.getView().getModel("invoiceModel")
            var invoiceItemModel = this.getView().getModel("invoiceItemModel")
            // invoiceItemModel.setProperty("/po_no",this.po_no)
            // invoiceItemModel.setProperty("/po_no",this.po_no)
            var payload = invoiceModel.oData;
            var invoiceItemsData = []

            if (invoiceItemModel.getData().invoiceItems) {
                invoiceItemsData = invoiceItemModel.getData().invoiceItems;
            }

            for (var i = 0; invoiceItemsData.length > i; i++) {
                invoiceItemsData[i].po_no_po_no = this.po_no
            }

            payload.Items = invoiceItemModel.oData.invoiceItems

            if (payload) {
                this._createEntity(payload)
            } else {
                MessageToast.show("No data was there.");
            }
        },



        _createEntity: function (payload) {
            // var data = payload
            console.log(payload)

            var oDataModel = this.getView().getModel();
            var path = `/Invoice`
            oDataModel.create(path, payload, {
                success: function (oData, response) {
                    invoiceRef.po_no = oData.po_no
                    invoiceRef.onDownloadPDF()

                },
                error: function (error) {
                    // Handle error if the PDF could not be retrieved
                    sap.m.MessageToast.show("Error downloading PDF");
                    console.error("Error downloading PDF:", error);
                }
            });

            // var settings = {
            //     url: "/odata/v2/invoice-service/tempInvoice",
            //     method: "POST",
            //     data: payload
            // };

            // return new Promise((resolve, reject) => {
            //     $.ajax(settings)
            //         .done((results) => {
            //             resolve(results.d.ID);
            //         })
            //         .fail((err) => {
            //             reject(err);
            //         });
            // });
        },


        onAddItem: function () {

            var invoiceItemModel = this.getView().getModel("invoiceItemModel");
            var newItem = {
                // po_no_po_no: "501",
                // item_id: "",
                description: "",
                qty: "",
                rate: "",
                amount: ""
            };


            var aItems = invoiceItemModel.getProperty("/invoiceItems") || [];

            aItems.push(newItem);


            invoiceItemModel.setProperty("/invoiceItems", aItems);
        },


        onCalAmount: function (oEvent) {
            invoiceRef.setInitialSelectState(oEvent)
            var oTable = this.byId("invoiceTable");
            var aItems = oTable.getItems();
            var oModel = this.getView().getModel("invoiceItemModel");
            var oData = oModel.getData();


            aItems.forEach((oItem, index) => {
                var oContext = oItem.getBindingContext("invoiceItemModel").getObject();
                var qty = parseFloat(oContext.qty) || 0;
                var rate = parseFloat(oContext.rate) || 0;

                oContext.amount = qty * rate;
                oData.invoiceItems[index].amount = oContext.amount;
            });

            oModel.refresh();
            this.calculateSubTotal();
        },

        calculateSubTotal: function (oEvent) {
            invoiceRef.setInitialSelectState(oEvent)
            var oModel = this.getView().getModel("invoiceItemModel");
            var oInvoiceModel = this.getView().getModel("invoiceModel");
            var aItems = oModel.getProperty("/invoiceItems");


            var subTotal = aItems.reduce((sum, item) => {
                return sum + (parseFloat(item.amount) || 0);
            }, 0);


            oInvoiceModel.setProperty("/sub_total", subTotal);
            // this.onDiscounted();
        },
        onDiscounted: function (oEvent) {
            invoiceRef.setInitialSelectState(oEvent)
            var oModel = this.getView().getModel("invoiceModel");
            var subTotal = oModel.getProperty("/sub_total");
            var discountPercent = oModel.getProperty("/discountPercent");
            if (subTotal) {
                var discount = (subTotal * discountPercent) / 100;;
                oModel.setProperty("/discount", discount);
            }
        },
        // onDiscounted: function (oEvent) {
        //     var oModel = this.getView().getModel("invoiceModel");
        //     var subTotal = oModel.getProperty("/sub_total");
        //     if (subTotal) {
        //         var discount = (subTotal * 0.85).toFixed(2); 
        //         oModel.setProperty("/discount", discount);
        //     }
        // },
        onCalculateTotal: function (oEvent) {
            invoiceRef.setInitialSelectState(oEvent)
            var oModel = this.getView().getModel("invoiceModel");
            var discount = parseFloat(oModel.getProperty("/discount")) || 0;
            var tax = parseFloat(oModel.getProperty("/tax")) || 0;
            var shipping = parseFloat(oModel.getProperty("/shipping")) || 0;


            var taxAmount = (discount * tax) / 100;
            var total = discount + taxAmount + shipping;
            oModel.setProperty("/total", total.toFixed(2));
        },
        onCalAmtPaid: function (oEvent) {
            invoiceRef.setInitialSelectState(oEvent)
            var oModel = this.getView().getModel("invoiceModel");
            var totalAmount = parseFloat(oModel.getProperty("/total")) || 0;
            var paidAmount = parseFloat(oModel.getProperty("/amount_paid")) || 0;

            var balanceDue = (totalAmount - paidAmount);
            oModel.setProperty("/balance_due", balanceDue);
        },
        onDeleteItem: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("invoiceItemModel");
            var sPath = oContext.getPath();
            var oModel = this.getView().getModel("invoiceItemModel");
            var aData = oModel.getProperty("/invoiceItems");
            var iIndex = parseInt(sPath.split("/").pop(), 10);
            aData.splice(iIndex, 1);
            oModel.setProperty("/invoiceItems", aData);
        },
        setInitialSelectState: function (oEvent) {
            oEvent.getSource().setValueState("None")
        },
        onValidation: function (oEvent) {
            invoiceRef.setInitialSelectState(oEvent)
        },
    });
});