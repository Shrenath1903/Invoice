const cds = require('@sap/cds');
// const PDFDocument = require('pdfkit-table');

const PDFDocument = require('pdfkit');

const { Readable } = require('stream');
const XLSX = require('xlsx')
const Busboy = require('busboy');
const formidable = require('formidable');
const SequenceHelper = require("./lib/SequenceHelper");

module.exports = cds.service.impl(async function () {
    // this.before('CREATE', 'Files', req => {
    //     console.log('Create called')
    //     console.log(JSON.stringify(req.data))
    //     req.data.url = `/invoice-service/Files(${req.data.ID})/content`
    // })

    // const db = await cds.connect.to("db");
    // this.before("CREATE", 'Invoice', async (req) => {
    //   const { Items } = req.data;

    //   // Check if there are associated InvoiceItems
    //   if (Items && Items.length > 0) {
    //     const itemIdGenerator = new SequenceHelper({
    //       db: db,
    //       sequence: "item_id",    // Name of the HDB sequence
    //       table: "InvoiceItems",  // Table name
    //       field: "item_id",       // Field in the table
    //     });
  
    //     // Generate item_id for each InvoiceItem in the expanded payload
    //     for (const item of Items) {
    //       item.item_id = await itemIdGenerator.getNextNumber();
    //     }
    //   }
    // });


    this.on('POST','Invoice', async (req,next) => {
      return next();
    });
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
        
    this.
    on('PUT','Files', async (req,next) => {

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
// async function generatePdfBuffer(invoice) {
//     const doc = new PDFDocument();

//     return new Promise((resolve, reject) => {
//         const chunks = [];
//         doc.on('data', (chunk) => chunks.push(chunk));
//         doc.on('end', () => resolve(Buffer.concat(chunks)));
//         doc.on('error', (err) => {
//             console.error('Error in PDF generation:', err);
//             reject(err);
//         });

//         // Add Invoice Header
//         doc.fontSize(18).text(`Invoice #${invoice.invoice_no}`, { align: 'center' });
//         doc.moveDown();
//         doc.fontSize(12).text(`Date: ${invoice.date}`);
//         doc.text(`Company: ${invoice.company_name}`);
//         doc.text(`Bill To: ${invoice.bill_to}`);
//         doc.text(`Ship To: ${invoice.ship_to}`);
//         doc.moveDown();
//         doc.text(`Payment Terms: ${invoice.payment_terms}`);
//         doc.text(`Due Date: ${invoice.due_date}`);
//         doc.moveDown();

//         // Add Items Table
//         if (invoice.items && invoice.items.length > 0) {
//             const table = {
//                 headers: [
//                     // { label: "ID", width: 50 },
//                     { label: "Description", width: 200 },
//                     { label: "Quantity", width: 70 },
//                     { label: "Rate", width: 70 },
//                     { label: "Amount", width: 70 },
//                 ],
//                 rows: invoice.items.map((item) => [
//                     // item.item_id,
//                     item.description,
//                     item.qty,
//                     item.rate,
//                     item.amount,
//                 ]),
//             };

//             // Add the table to the document
//             doc.table(table, {
//                 prepareHeader: () => doc.fontSize(12).font("Helvetica-Bold"),
//                 prepareRow: (row, i) => doc.fontSize(12).font("Helvetica"),
//                 startY: doc.y + 20,
//             });
//         } else {
//             doc.text('No items available for this invoice.');
//         }

//         // Finalize the document
//         doc.end();
//     });
// }



async function generatePdfBuffer(invoice) {
  const doc = new PDFDocument({ margin: 50 });

  return new Promise((resolve, reject) => {
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => {
          console.error('Error in PDF generation:', err);
          reject(err);
      });

      // Add Business Header
      doc.fontSize(16).font('Helvetica-Bold').text(`[Business Name]`, { align: 'left' });
      doc.fontSize(10).font('Helvetica').text(`[Business Address 1]`);
      doc.text(`[City], [State] [Postal Code]`);
      doc.text(`[Business Phone Number]`);
      doc.text(`[Business Email Address]`);
      doc.moveDown();

      // Invoice Title
      doc.fontSize(18).font('Helvetica-Bold').text(`Invoice`, { align: 'center' });
      doc.moveDown();

      // Client and Invoice Info
      doc.fontSize(12).font('Helvetica').text(`Bill To: client name`);
      doc.text("address ");
      doc.moveDown();

      doc.text(`Invoice Number: 402`);
      doc.text(`Date: 4-2-2024`);
      doc.moveDown();

      // Items Table
      if (invoice.items && invoice.items.length > 0) {
          doc.moveDown();
          doc.fontSize(12).font('Helvetica-Bold').text('Items:');
          doc.moveDown();

          const tableTop = doc.y;
          const itemRowHeight = 20;
          const tableHeaders = ['Description', 'Quantity', 'Rate', 'Amount'];

          // Column width allocation
          const columnWidths = {
              description: 200, // Larger width for Description
              quantity: 70,
              rate: 70,
              amount: 70,
          };
          
          const columnPositions = {
              description: 50,
              quantity: 50 + columnWidths.description,
              rate: 50 + columnWidths.description + columnWidths.quantity,
              amount: 50 + columnWidths.description + columnWidths.quantity + columnWidths.rate,
          };
          
          // Draw table headers
          doc.font('Helvetica-Bold').fontSize(12);
          doc.lineWidth(0.5);
          
          tableHeaders.forEach((header, index) => {
              let x = Object.values(columnPositions)[index];
              let width = Object.values(columnWidths)[index];
          
              // Draw header text centered
              doc.text(header, x, tableTop, { width, align: 'center' });
          
              // Draw vertical line
              if (index > 0) {
                  doc.moveTo(x - 5, tableTop - 5).lineTo(x - 5, tableTop + 20).stroke();
              }
          });
          
          // Draw a horizontal line below the headers
          doc.moveTo(50, tableTop + 20).lineTo(50 + columnWidths.description + columnWidths.quantity + columnWidths.rate + columnWidths.amount, tableTop + 20).stroke();
          
          // Draw table rows
          doc.font('Helvetica').fontSize(10);
          
          invoice.items.forEach((item, rowIndex) => {
              const rowY = tableTop + (rowIndex + 1) * 30; // Adjust row height as needed
          
              // Draw item cells with text centered
              doc.text(item.description, columnPositions.description, rowY, {
                  width: columnWidths.description,
                  align: 'center',
              });
              doc.text(item.qty.toString(), columnPositions.quantity, rowY, {
                  width: columnWidths.quantity,
                  align: 'center',
              });
              doc.text(`Rs. ${item.rate.toFixed(2)}`, columnPositions.rate, rowY, {
                  width: columnWidths.rate,
                  align: 'center',
              });
              doc.text(`Rs. ${item.amount.toFixed(2)}`, columnPositions.amount, rowY, {
                  width: columnWidths.amount,
                  align: 'center',
              });

          
              // Draw vertical lines for each column
              Object.values(columnPositions).forEach((x, colIndex) => {
                  if (colIndex > 0) {
                      doc.moveTo(x - 5, rowY - 5).lineTo(x - 5, rowY + 25).stroke();
                  }
              });
          });
          
          // Draw a horizontal line after the last row
          const lastRowY = tableTop + invoice.items.length * 30;
          doc.moveTo(50, lastRowY + 20).lineTo(50 + columnWidths.description + columnWidths.quantity + columnWidths.rate + columnWidths.amount, lastRowY + 20).stroke();
      } else {
          doc.text('No items available for this invoice.', { align: 'center' });
      }

      // Total Section
      // doc.moveDown(2);
      // doc.fontSize(12).font('Helvetica').text(`Total: Rs. ${invoice.total}`,350);
      // // doc.text(`Paid Amount: Rs. ${invoice.amount_paid}`,300,{ align: 'right' });
      // // doc.text(`Balance Due: Rs. ${invoice.balance_due}`,300,{ align: 'right' });
      // doc.moveDown();



      // Draw Total Section
      const summaryStartY = doc.y + 20; // Adjust spacing after the last table row
      const summaryLabelX = 330; // Left alignment for labels
      const valueOffset = 80; // Space between label and value
      
      // Utility function to calculate dynamic line width based on text size
      function drawDynamicLine(startX, startY, label, value) {
          const valueWidth = doc.widthOfString(value); // Get width of the value string
          const endX = startX + valueOffset + valueWidth + 10; // Extend line slightly beyond value
          doc.moveTo(startX, startY).lineTo(endX, startY).stroke();
      }
      
      // Total
      doc.font('Helvetica-Bold').text('Total', summaryLabelX, summaryStartY, { align: 'left' });
      doc.text(
          `Rs. ${invoice.total.toFixed(2)}`,
          summaryLabelX + valueOffset,
          summaryStartY,
          { align: 'left' }
      );
      // Draw line under Total
      drawDynamicLine(summaryLabelX, summaryStartY + 15, 'Total', `Rs. ${invoice.total.toFixed(2)}`);
      
      // Paid Amount
      doc.font('Helvetica-Bold').text('Paid Amount', summaryLabelX, summaryStartY + 25, { align: 'left' });
      doc.text(
          `Rs. ${invoice.amount_paid.toFixed(2)}`,
          summaryLabelX + valueOffset,
          summaryStartY + 25,
          { align: 'left' }
      );
      // Draw line under Paid Amount
      drawDynamicLine(summaryLabelX, summaryStartY + 40, 'Paid Amount', `Rs. ${invoice.amount_paid.toFixed(2)}`);
      
      // Balance Due
      doc.font('Helvetica-Bold').text('Balance Due', summaryLabelX, summaryStartY + 50, { align: 'left' });
      doc.text(
          `Rs. ${invoice.balance_due.toFixed(2)}`,
          summaryLabelX + valueOffset,
          summaryStartY + 50,
          { align: 'left' }
      );
      // Draw line under Balance Due
      drawDynamicLine(summaryLabelX, summaryStartY + 65, 'Balance Due', `Rs. ${invoice.balance_due.toFixed(2)}`);
      
      // Notes Section
      doc.fontSize(10).font('Helvetica').text(`Notes: ${invoice.Notes}`,summaryLabelX,summaryStartY+100);
      doc.moveDown();

      // Finalize the document
      doc.end();
  });
}

// Sample Invoice Data
const sampleInvoice = {
  client_name: '[Client Name]',
  client_address: '[Client Address line 1], [City], [State] [Postal Code]',
  invoice_no: 2001321,
  date: '11/25/2024',
  items: [
      { description: 'Item 1 description', qty: 15, rate: 10, amount: 150 },
      { description: 'Item 2 description', qty: 10, rate: 5, amount: 50 },
      { description: 'Item 3 description', qty: 20, rate: 5.5, amount: 110 },
  ],
  total: 310,
  amount_paid: 0,
  balance_due: 310,
  Notes: 'test',
};


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