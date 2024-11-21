const cds = require('@sap/cds');
const PDFDocument = require('pdfkit-table');
const { Readable } = require('stream');
const XLSX = require('xlsx')
const Busboy = require('busboy');
const formidable = require('formidable');
module.exports = cds.service.impl(async function () {
    // this.before('CREATE', 'Files', req => {
    //     console.log('Create called')
    //     console.log(JSON.stringify(req.data))
    //     req.data.url = `/invoice-service/Files(${req.data.ID})/content`
    // })

    this.on('READ', 'PDFEntity', async (req,next) => {
        const getUrlPath = (req) => req._.req?.originalUrl || req._.req?.url || '';

        // Check if the URL path indicates a PDF download request
        if (req.data.po_no && getUrlPath(req).includes('/pdf')) {
            const { po_no, pr_no } = req.data;
            console.log("Received PO Number:", po_no);

            try {
                if (!po_no && !pr_no) {
                    req.error(400, 'PO Number or PR Number is missing.');
                    return;
                }

                // Fetch the invoice data using the PO number
                const invoice = await cds.run(
                    SELECT.one.from('db.Invoice')
                        .where({ po_no })
                );

                if (!invoice) {
                    req.error(404, `Invoice with PO number ${po_no} not found.`);
                    return;
                }

                // Fetch the related InvoiceItems
                const invoiceItems = await cds.run(
                    SELECT.from('db.InvoiceItems')
                        .where({ po_no })
                );

                // Combine invoice and items
                const invoiceData = {
                    ...invoice,
                    items: invoiceItems || [],
                };

                // Generate the PDF content
                const bufferData = await generatePdfBuffer(invoiceData);

                // Set metadata for the PDF
                const fileName = `Invoice_${po_no || pr_no}.pdf`;
                const contentType = 'application/pdf';

                // Set response headers
                req._.res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                });

                // Send the PDF as the response
                req._.res.end(bufferData);

            } catch (error) {
                console.error('Error processing PDF download:', error);
                req.error(500, 'An error occurred while processing the PDF.');
            }
        } else {
            // If it's not a PDF request, continue with the normal read operation
            try {
                const attachments = await next();
                return attachments;
            } catch (error) {
                console.error('Error in normal data fetch:', error);
                req.error(500, 'An error occurred while fetching the data.');
            }
        }
    });
    //  Excel



    this.on('POST','Files', async (req,next) => {

     try {
            const attachments = await next();
            return attachments;
        } catch (error) {
            console.error('Error in normal data fetch:', error);
            req.error(500, 'An error occurred while fetching the data.');
        }
    });
        
    this.on('PUT','Files', async (req,next) => {

        if (req.data.content) {
            try {
              const excelStream = req.data.content;
              const buffer = await streamToBuffer(excelStream);
          
              if (!buffer) {
                req.error('Unable to read the file');
                return;
              }
          
              // Read the Excel workbook
              const workbook = XLSX.read(buffer, { type: 'buffer', cellText: true, cellDates: true });
          
              const sheetData = [];
              workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Get data as rows
                const headers = rows[0]; // First row as headers
                const dataRows = rows.slice(1); // Remaining rows as data
          
                // Map rows into structured data for Invoice entity
                const structuredData = dataRows.map(row => {
                  const data = {};
                  headers.forEach((header, index) => {
                    data[header.trim().toLowerCase().replace(/ /g, '_')] = row[index];
                  });
                  return {
                    po_no: data.po_no,
                    invoice_no: data.invoice_no,
                    date: new Date(data.date),
                    company_name: data.company_name,
                    bill_to: data.bill_to,
                    ship_to: data.ship_to,
                    payment_terms: data.payment_terms,
                    due_date: new Date(data.due_date),
                    sub_total: data.sub_total,
                    discount: data.discount,
                    tax: data.tax,
                    shipping: data.shipping,
                    total: data.total,
                    amount_paid: data.amount_paid,
                    balance_due: data.balance_due,
                    Notes: data.notes,
                    Terms: data.terms,
                    Currency: data.currency
                  };
                });
          
                sheetData.push(...structuredData);
              });
          
              // Log data for debugging
              console.log('Data being inserted:', sheetData);
          
              // Insert all data into the Invoice entity
              const db = cds.transaction(req);
              await db.run(INSERT.into('db.Invoice').entries(sheetData));
          
              req.notify({
                code: 'msgUploadSuccessful',
                message: 'Excel data has been successfully processed and stored in the Invoice entity.',
                status: 200
              });
            } catch (error) {
              console.error(error);
              return req.error(400, JSON.stringify(error));
            }
          }
    });
});

// Helper function to generate PDF content
async function generatePdfBuffer(invoice) {
    const doc = new PDFDocument();

    return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => {
            console.error('Error in PDF generation:', err);
            reject(err);
        });

        // Add Invoice Header
        doc.fontSize(18).text(`Invoice #${invoice.invoice_no}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date: ${invoice.date}`);
        doc.text(`Company: ${invoice.company_name}`);
        doc.text(`Bill To: ${invoice.bill_to}`);
        doc.text(`Ship To: ${invoice.ship_to}`);
        doc.moveDown();
        doc.text(`Payment Terms: ${invoice.payment_terms}`);
        doc.text(`Due Date: ${invoice.due_date}`);
        doc.moveDown();

        // Add Items Table
        if (invoice.items && invoice.items.length > 0) {
            const table = {
                headers: [
                    { label: "ID", width: 50 },
                    { label: "Description", width: 200 },
                    { label: "Quantity", width: 70 },
                    { label: "Rate", width: 70 },
                    { label: "Amount", width: 70 },
                ],
                rows: invoice.items.map((item) => [
                    item.item_id,
                    item.description,
                    item.qty,
                    item.rate,
                    item.amount,
                ]),
            };

            // Add the table to the document
            doc.table(table, {
                prepareHeader: () => doc.fontSize(12).font("Helvetica-Bold"),
                prepareRow: (row, i) => doc.fontSize(12).font("Helvetica"),
                startY: doc.y + 20,
            });
        } else {
            doc.text('No items available for this invoice.');
        }

        // Finalize the document
        doc.end();
    });
}



async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const buffers = []
  
      stream.on('data', (dataChunk) => buffers.push(dataChunk))
  
      stream.on('end', () => {
        const buffer = Buffer.concat(buffers)
        resolve(buffer)
      })
  
      stream.on('error', (error) => {
        console.error('File streaming error', error)
        reject(error)
      })
    })
  }

// async function streamToBuffer(stream) {
//     return new Promise((resolve, reject) => {
//       const buffers = []
  
//       stream.on('data', (dataChunk) => buffers.push(dataChunk))
  
//       stream.on('end', () => {
//         const buffer = Buffer.concat(buffers)
//         resolve(buffer)
//       })
  
//       stream.on('error', (error) => {
//         console.error('File streaming error', error)
//         reject(error)
//       })
//     })
//   }

  async function insertRowsIntoInvoice(rows, req) {
    try {
      const db = cds.transaction(req); // Get the transaction for the request
  
      // Loop through rows and insert them into the invoice entity
      for (const row of rows) {
        await db.run(INSERT.into('db.Invoice').entries(row));
      }
    } catch (error) {
      console.error('Error inserting data into invoice entity:', error);
      throw error;
    }
  }