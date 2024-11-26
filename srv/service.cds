using { db } from '../db/invoice';

service invoice_service {
    entity Invoice as projection on db.Invoice;
    entity InvoiceItems as projection on db.InvoiceItems;
    entity PDFEntity as projection on db.PDFEntity;
    entity Files as projection on db.Files;
    entity sendmail as projection on db.Files;

}


// using { db } from '../db/invoice';

// service invoice_service {

//     entity Invoice as projection on db.Invoice;

//     action downloadPDF(po_no : Integer) returns db.PDFResponse;

// }
