namespace db;
using {
     cuid,
    managed
} from '@sap/cds/common';

entity Invoice:managed {
    key po_no         : Integer;
        invoice_no    : Integer;
        date          : Date;
        company_name  : String;
        bill_to       : String;
        ship_to       : String;
        payment_terms : String;
        due_date      : Date;
        sub_total     : Integer;
        discount      : Integer;
        tax           : Integer;
        shipping      : Integer;
        total         : Integer;
        amount_paid   : Integer;
        balance_due   : Integer;
        Notes         : String;
        Terms         : String;
        Currency      : String;
        Items         : Composition of many InvoiceItems
                                on Items.po_no = $self; // 
}

entity InvoiceItems {
    key po_no       : Association to Invoice;
    key item_id     : Integer;
       description : String;
       qty         : Integer;
       rate        : Integer;
       amount      : Integer;
}

entity PDFEntity {
    key po_no   : Integer; 
    invoice     : Association to Invoice; // Relation to Invoice
    virtual pdf : LargeBinary @Core.MediaType : 'application/pdf'; // Virtual field for PDF
}

entity Files:  cuid,managed{
    @Core.MediaType : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        content : LargeBinary;
    fileName: String;
    size: Integer;
    url: String;
}
entity tempInvoice:managed {
    key po_no         : Integer;
        invoice_no    : Integer;
        date          : Date;
        company_name  : String;
        bill_to       : String;
        ship_to       : String;
        payment_terms : String;
        due_date      : Date;
        sub_total     : Integer;
        discount      : Integer;
        tax           : Integer;
        shipping      : Integer;
        total         : Integer;
        amount_paid   : Integer;
        balance_due   : Integer;
        Notes         : String;
        Terms         : String;
        Currency      : String;
};