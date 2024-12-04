var invoiceRef
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
    "./validation",
    "sap/ui/core/Fragment"
], (Controller, JSONModel, MessageBox, validation,Fragment) => {
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
            var mailModel = new JSONModel
            this.getView().setModel(mailModel, "mailModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("edit").attachPatternMatched(this._onObjectMatched, this);

            // this.onNumbervalidation(oEvent)

            this.setheaderImage()


        },

        setheaderImage: function() {
            var sImagePath1 = jQuery.sap.getModulePath("invoiceapp", "/Image/invoiceFormat-1.png")
            var sImagePath2 = jQuery.sap.getModulePath("invoiceapp", "/Image/invoiceFormat-2.png")

            var imageData = {
                img_1: sImagePath1,
                img_2: sImagePath2
            };

            var imageModel = new sap.ui.model.json.JSONModel(imageData);
            this.getView().setModel(imageModel, "imageModel");
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
                var po_no = po_no_t

            }
            else {
                // var po_no = po_no_t
                var po_no = this.po_no

            }
            var sPath = `/PDFEntity(po_no=${po_no})`;

            var sServiceUrl = this.getView().getModel().sServiceUrl;
            var sParsedServiceUrl = sServiceUrl.indexOf("/") === 2 ? sServiceUrl.substring(2) : sServiceUrl;
            var sUrl = sParsedServiceUrl + sPath + "/pdf";

            window.open(sUrl, '_blank');
        },

        //   offline 

        downloadInvoice: function (oEvent) {
            if(this._oDialog)
                this._oDialog.close();
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

        testData: function () {

            var data = {
                invoice_no    : "101",
                date          : "",
                company_name  : "sap",
                Company_gst_no  : "37B76C238B7E1Z5",
                bill_to       : "Germany",
                ship_to       : "Pondy",
                payment_terms : "Cash",
                due_date      : "",
                sub_total     : "4500",
                discount      : "200",
                discountPercent : "10",
                tax           : "500",
                shipping      : "300",
                total         : "5000",
                amount_paid   : "100",
                balance_due   : "4900",
                Notes         : "Good",
                Terms         : "no",
                Currency      : "INR",
                template       : 1
            }
            var invoiceModel = this.getView().getModel("invoiceModel")
            invoiceModel.setData(data);

            var invoiceItemModel = this.getView().getModel("invoiceItemModel");
            var newItem = {
                // po_no_po_no: "501",
                // item_id: "",
                description: "cpu",
                qty: "10",
                rate: "45",
                amount: "4500"
            };
            var aItems = invoiceItemModel.getProperty("/invoiceItems") || [];
            aItems.push(newItem);
            invoiceItemModel.setProperty("/invoiceItems", aItems);
        },



        onNumbervalidation : function(oEvent) {
            validateNumber(oEvent);
         },

        onCalAmount: function (oEvent) {
            console.log(oEvent)
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
            invoiceRef.calculateSubTotal(oEvent);
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

// Mail pop Over start
        onOpenPopover: function () {
            var oView = this.getView();

            // Check if the fragment is already loaded

            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment(oView.getId(),
                    "invoiceapp.view.mailPopOver",
                    this
                );
                oView.addDependent(this._oDialog);
                this._oDialog.open();
            } else {
                this._oDialog.open();
            }

         
        },

        onMailPopup: function () {
            if (this._oDialog) {
                this._oDialog.close();
            }
        },

        onSubmit: function () {
            // Get input values from the fragment
            var mailModel = this.getView().getModel('mailModel').oData
            var mail_id = mailModel.mail_id
            var text = mailModel.text
            // Validate inputs
            if (!mail_id) {
                MessageToast.show("Please provide Mail Id.");
                return;
            }

            // Prepare payload
            var oPayload = {
                mail_id: mail_id,
                text: text
            };
            var oDataModel = this.getView().getModel();
            var entityPath = "/mail"
            oDataModel.create(entityPath, oPayload, {
                   // headers: 
                    success: function (oData, response) {
                        MessageToast.show("Mail Send !");

                    },
                    error: function (oError) {
                        var errorJson = JSON.parse(oError.responseText);
                        invoiceRef._showServiceError(errorJson)
                    }
                });

            // Close the dialog
            this._oDialog.close();
        },
// Mail pop Over end
onTemplateclick: function () {
    var oView = this.getView();

    // Check if the fragment is already loaded

    if (!this.template_dialog) {
        this.template_dialog = sap.ui.xmlfragment(oView.getId(),
            "invoiceapp.view.templatePopOver",
            this
        );
        oView.addDependent(this.template_dialog);
        this.template_dialog.open();
    } else {
        this.template_dialog.open();
    }

 
},

onImageSelect: function (oEvent) {
    var invoiceModel = this.getView().getModel("invoiceModel");
    // var first = "1"
    // var second = "2"
    const sImageId = oEvent.getSource().getCustomData()[0].getValue();
    if (sImageId === "image_1") {
       
        invoiceModel.setProperty("/template", "1");
        console.log("Image 1 selected");
        // Logic for image 1
    } else if (sImageId === "image_2") {
        invoiceModel.setProperty("/template", "2");
        console.log("Image 2 selected");
        // Logic for image 2
    }
},


ontemplatePopOver: function () {
    if (this.template_dialog) {
        this.template_dialog.close();
    }
},





    });
});