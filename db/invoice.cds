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
        Company_gst_no : String;
        bill_to       : String;
        ship_to       : String;
        bill_from_name    : String;
        bill_from_address : String;
        bill_from_city : String;
        bill_from_zip : String;
        bill_from_country : String;
        payment_terms : String;
        due_date      : Date;
        sub_total     : Integer;
        discount      : Integer;
        discountPercent : Integer;
        tax           : Integer;
        shipping      : Integer;
        total         : Integer;
        amount_paid   : Integer;
        balance_due   : Integer;
        Notes         : String;
        Terms         : String;
        Currency      : String;
        mail_id       : String;
        text       : String;
        bill_to_name : String;
        bill_to_city : String;
        bill_to_zip  : Integer;
        bill_to_country : String;
        template   : Integer;
        Items         : Composition of many InvoiceItems
                                on Items.po_no = $self; // 
}

entity InvoiceItems {
    key po_no      : Association to Invoice;
    key item_id         : UUID;  
    description    : String;
    qty            : Integer;
    rate           : Integer;
    amount         : Integer;
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

