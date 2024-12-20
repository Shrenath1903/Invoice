var invoiceRef
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    'sap/m/MessageBox',
    "sap/ui/model/json/JSONModel",
    "sap/ui/unified/FileUploader"
], (Controller,MessageToast,MessageBox,JSONModel,FileUploader) => {
    "use strict";

    return Controller.extend("invoiceapp.controller.main", {
        onInit() {
            var invoiceExcelModel = new JSONModel({
                rows: [] // Empty rows initially
              });
              this.getView().setModel(invoiceExcelModel,"invoiceExcelModel");
        },

        onPress: function (oEvent) {
            invoiceRef = this;
            const po_no = oEvent.getSource().getBindingContext().getObject().po_no;

            const oBindingContext = oEvent.getSource().getBindingContext();
            var sPath = `/PDFEntity(po_no=${po_no})`; 
    
            const sServiceUrl = oBindingContext.getModel().sServiceUrl;
            const sParsedServiceUrl = sServiceUrl.indexOf("/") === 2 ? sServiceUrl.substring(2) : sServiceUrl;
            const sUrl = sParsedServiceUrl + sPath + "/pdf";
            window.open(sUrl, '_blank');
          },

        //   onUploadComplete: function (oEvent) {
        //     try {
        //         const iStatus = oEvent.getParameter('status');
        //         const oRawResponse = oEvent.getParameter('responseRaw');
        //         let oFileUploader = oEvent.getSource();
        
        //         if (iStatus >= 400) {
        //             // const oParsedResponse = JSON.parse(oRawResponse || '{}');
        //             console.error("Error response:");
        //             // showError(oParsedResponse?.error?.message || "Unknown error occurred.");
        //         } else {
        //             MessageToast.show('Uploaded successfully');
        //             oExtensionAPI.refresh();
        //         }
        //     } catch (e) {
        //         console.error("Upload Complete Error:", e);
        //         // showError("Unexpected error occurred during file upload.");
        //     } finally {
        //         let oFileUploader = oEvent.getSource();
        //         oFileUploader.clear();

        //     }
        // },

        fileupload: function () {
            // setDialogBusy(true)
    
            let oFileUploader = this.getView().byId('uploader')
    
            let headerParameter = new sap.ui.unified.FileUploaderParameter()
            headerParameter.setName('slug')
            headerParameter.setValue(oFileUploader.getProperty('value'))
            oFileUploader.removeHeaderParameter('slug')
            oFileUploader.addHeaderParameter(headerParameter)
    
            oFileUploader
              .checkFileReadable()
              .then(function () {
                oFileUploader.upload()
              })
              .catch(function () {
                showError('The file cannot be read')
                setDialogBusy(false)
              })
          },

        onNavigation: function(oEvent)
        {
            var po_no = oEvent.getSource().getBindingContext().getProperty("po_no");
            sap.m.MessageToast.show("clicked");
            this.getOwnerComponent().getRouter().navTo("edit", {
                po_no: po_no,
            }); 

        },
        
        offline: function(oEvent)
        {
            this.getOwnerComponent().getRouter().navTo("edit",{
                po_no: "temp",
            });
        },
        
        onFileAllowed: function()
        {
            var oDataModel = this.getView().getModel();
            var path = "/Files"
            oDataModel.create(path, data, {
                success: function(data, response){
                    MessageBox.success("Data successfully created");
                },
                error: function(error){
                    MessageBox.error("Error while creating the data");
                }
            });
        },

        // File upload blog

        
        onUploadComplete: function (oEvent) {
            // The uploaded file is not directly available here; use the FileUploader instance
            var oFileUploader = this.byId("uploader");
            var file = oFileUploader.oFileUpload.files[0]; // Access the HTML input's file object directly

            if (file) {
                this._createEntity(file)
                    .then((id) => {
                        this._uploadContent(file, id);
                    })
                    .catch((err) => {
                        console.error("Error during entity creation:", err);
                    });
            } else {
                MessageToast.show("No file uploaded or accessible.");
            }
        },

        _createEntity: function (file) {
            var data = {
                mediaType: file.type,
                fileName: file.name,
                size: file.size
            };

            var settings = {
                url: "/odata/v2/invoice-service/Files",
                method: "POST",
                data: JSON.stringify(data)
            };

            return new Promise((resolve, reject) => {
                $.ajax(settings)
                    .done((results) => {
                        resolve(results.d.ID);
                    })
                    .fail((err) => {
                        reject(err);
                    });
            });
        },

        _uploadContent: function (file, id) {
            var uploadUrl = `/odata/v2/invoice-service/Files(${id})/content`;
            var formData = new FormData();
            formData.append("file", file);

            $.ajax({
                url: uploadUrl,
                method: "PUT",
                processData: false,
                data: formData,
                success: function () {
                    MessageToast.show("File uploaded successfully.");
                },
                error: function (err) {
                    console.error("Error during file upload:", err);
                    MessageToast.show("File upload failed.");
                }
            });
        },

        //  testing 
        onFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oFile = oFileUploader.oFileUpload.files[0];
      
            if (oFile) {
              var reader = new FileReader();
              reader.onload = this._onFileLoaded.bind(this);
              reader.readAsArrayBuffer(oFile);
            }
          },
      
          _onFileLoaded: function (oEvent) {
            var arrayBuffer = oEvent.target.result;
            var data = new Uint8Array(arrayBuffer);
            var workbook = XLSX.read(data, { type: 'array' });
      
            // Assuming the first sheet is the one to be processed
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var jsonData = XLSX.utils.sheet_to_json(sheet);
      
            // Now set the parsed data to the model
            var invoiceExcelModel = this.getView().getModel("invoiceExcelModel");
            // invoiceExcelModel.setProperty("/rows", jsonData);
            invoiceExcelModel.setData({ items: jsonData })
          },
      
          handleUploadPress: function () {
            var oFileUploader = this.byId("fileUploader");
            oFileUploader.upload(); // Trigger file upload if needed
          },
      
          onPress: function (oEvent) {
            // Handle button press event if needed (e.g., for downloading the file)
            sap.m.MessageToast.show("Download button pressed.");
          },
      
          onNavigation: function (oEvent) {
            // Handle row press (navigate to detail page or show more info)
            sap.m.MessageToast.show("Row pressed.");
          },
          
          store: function () {
            var payloadss = {
                po_no: 12345,
                invoice_no: 67890,
                date: "2024-12-20",
                company_name: "ABC Pvt. Ltd.",
                Company_gst_no: "GST12345",
                bill_to: "Client Address",
                ship_to: "Warehouse Address",
                bill_from_name: "Supplier Name",
                bill_from_address: "Supplier Address",
                bill_from_city: "Supplier City",
                bill_from_zip: "123456",
                bill_from_country: "Country",
                payment_terms: "Net 30",
                due_date: "2025-01-19",
                sub_total: 1000,
                discount: 50,
                discountPercent: 5,
                tax: 100,
                shipping: 20,
                total: 1070,
                amount_paid: 500,
                balance_due: 570,
                Notes: "Thank you for your business.",
                Terms: "Payment due within 30 days.",
                Currency: "USD",
                mail_id: "client@example.com",
                text: "Invoice text",
                bill_to_name: "Client Name",
                bill_to_city: "Client City",
                bill_to_address: "Client Address",
                bill_to_zip: 654321,
                bill_to_country: "Client Country",
                template: 1,
                Items: [] // Empty array or omit completely if no items
            };

            
            var invoiceExcelModel = this.getView().getModel("invoiceExcelModel").oData;
            var payload = invoiceExcelModel.items[0];
        
            // Ensure payload is valid
            if (!payload.Items) {
                payload.Items = []; // Default to an empty array if missing
            }
        
            var oDataModel = this.getView().getModel();
            var path = `/Invoice`;
            oDataModel.create(path, payload, {
                success: function (oData, response) {
                    invoiceRef.po_no = oData.po_no;
                    invoiceRef.onDownloadPDF();
                },
                error: function (error) {
                    sap.m.MessageToast.show("Error downloading PDF");
                    console.error("Error downloading PDF:", error);
                }
            });
        }
        

    });
});