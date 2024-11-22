var invoiceRef
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessageBox',
], (Controller,JSONModel,MessageBox) => {
    "use strict";

    return Controller.extend("invoiceapp.controller.edit", {
        onInit() {
            invoiceRef = this
            var invoiceModel = new JSONModel
            this.getView().setModel(invoiceModel,"invoiceModel");
            var invoiceItemModel = new JSONModel
            this.getView().setModel(invoiceItemModel,"invoiceItemModel");

            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("edit").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var argument = oEvent.getParameter("arguments")
            if (!argument.po_no == "temp")
            {
                this.po_no =argument.po_no;
                this.loadData(this.po_no);
            }
        },
        loadData: function(po_no)
        {
            var invoiceModel = this.getView().getModel("invoiceModel")
            var oDataModel = this.getView().getModel();
            var path = `/Invoice(po_no=${po_no})`
            oDataModel.read(path, {
            urlParameters: { "$expand": "Items" },
            success: function (oData, response) {
                var test = oData
                if(oData.Items)
                {
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
        loadInvoiceItemModel: function(oData)
        {
            var items = oData.Items.results
            var invoiceItemModel = this.getView().getModel("invoiceItemModel")
            invoiceItemModel.setData({invoiceItems:items})
            console.log(invoiceItemModel);
            
        },
        updateInvoice: function()
        {
            var invoiceModel = this.getView().getModel("invoiceModel")
            var payload = invoiceModel.oData;
            delete payload.createdBy; 
            delete payload.createdAt; 
            console.log(payload)
            var path = `/Invoice(po_no=${this.po_no})`;
            var oDataModel = this.getView().getModel();

            oDataModel.update(path,payload,{
                success: function(data,response){
                    MessageBox.success("Successfully Updated");
                },
                error: function(error){
                    MessageBox.error("Error while updating the data");
                }
            });
        },
        onDownloadPDF: function (po_no_t) {
            if(po_no_t)
            {
                var po_no = po_no_t
            }
            else
            {
                var po_no = this.po_no
            }
            var sPath = `/PDFEntity(po_no=${po_no})`; 
    
            const sServiceUrl = this.getView().getModel().sServiceUrl;
            const sParsedServiceUrl = sServiceUrl.indexOf("/") === 2 ? sServiceUrl.substring(2) : sServiceUrl;
            const sUrl = sParsedServiceUrl + sPath + "/pdf";
            window.open(sUrl, '_blank');
          },
    
        //   offline 

        downloadInvoice: function (oEvent) {
            var invoiceModel = this.getView().getModel("invoiceModel")
            var payload = invoiceModel.oData;

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
            oDataModel.create(path,payload, {
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
        
    });
});