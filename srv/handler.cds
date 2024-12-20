using { db } from '../db/invoice';
using {
     cuid,
    managed
} from '@sap/cds/common';

service invoice_service {
    entity Invoice as projection on db.Invoice;
    entity InvoiceItems as projection on db.InvoiceItems;
    entity PDFEntity as projection on db.PDFEntity;
    entity Doc as projection on db.Doc;
    entity sendmail as projection on db.Doc;
    // entity  as projection on db.TestEntity;

    entity Users as projection on db.Users;
    entity UploadExcel as projection on db.UploadExcel;
     // Define an action or function to handle the file upload

    //    action UploadFile(); 

}


// using { db } from '../db/invoice';

// service invoice_service {

//     entity Invoice as projection on db.Invoice;

//     action downloadPDF(po_no : Integer) returns db.PDFResponse;

// }
