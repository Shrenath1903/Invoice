var invoiceRef
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    'sap/m/MessageBox',
], (Controller,MessageToast,MessageBox) => {
    "use strict";

    return Controller.extend("invoiceapp.controller.main", {
        onInit() {
        },

        onPress: function (oEvent) {
            invoiceRef = this
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
        }
    });
});