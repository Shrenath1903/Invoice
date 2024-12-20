const cds = require('@sap/cds');
// const PDFDocument = require('pdfkit-table');
const axios = require('axios'); // To fetch the file content
const multer = require('multer');
const path = require('path');

const PDFDocument = require('pdfkit');
const { jsPDF } = require("jspdf");
require('jspdf-autotable');

const { Readable } = require('stream');
const XLSX = require('xlsx')

const SequenceHelper = require("./lib/SequenceHelper");

const { sendMail } = require('@sap-cloud-sdk/mail-client');

// const uuid = require('uuid');
// const { InvoiceItems } = this.entities;
module.exports = cds.service.impl(async function () {

 



  // Testing entity starts

  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });
  

  this.on('POST','Invoice',async(req,next) => {
    console.log(req)
    return next()
  })
  this.on('POST','UploadExcel', async (req) => {
    try {
        // Check if a file is uploaded
        var rquest = upload.single('file')
        if (!rquest.file) {
            return res.status(400).send('No file uploaded.');
        }

        // Get the raw binary content from the uploaded file
        const fileBuffer = rquest.file.buffer;
        const fileName = rquest.file.originalname;

        // Store the file in the UploadExcel entity
        const UploadExcel = await cds.connect.to('my.InvoiceService').transaction(req);
        const uploadEntity = await UploadExcel.create({
            content: fileBuffer,
            fileName: fileName
        });

        // Now parse the Excel file
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Check if data exists and map it to User entity
        if (data && data.length > 0) {
            // Insert the extracted data into the Users table
            const Users = await cds.connect.to('my.InvoiceService').transaction(req);

            for (const row of data) {
                await Users.create({
                    Name: row.Name,
                    Age: row.Age,
                    Email: row.Email
                });
            }

            // Respond with a success message
            res.status(200).send('File uploaded and data stored successfully!');
        } else {
            res.status(400).send('No data found in the Excel file.');
        }
    } catch (error) {
        res.status(500).send('Error processing the file: ' + error.message);
    }
});
  // Testing entity end

    this.before('CREATE', 'Doc', req => {
        console.log('Create called')
        console.log(JSON.stringify(req.data))
        req.data.url = `/invoice-service/Doc(${req.data.ID})/content`
        console.debug(req.data)
    })

    // this.on('GET','Files',req =>{
    //   console.debug(req)
    // })


    this.on('PUT', 'Doc', async (req) => {
      try {
          // Fetch the Excel file from the database
          const fileId = req.data.ID; // Assume the file ID is passed as a query parameter
          const docRecord = await cds.run(SELECT.one.from('db.Doc'));
        //   await cds.run(
        //     SELECT.one.from('db.Invoice')
        //         .where({ po_no })
        // );
        if (!docRecord || !docRecord.url) {
          return req.reject(404, 'Document not found or URL is missing');
      }
      const baseUrl = 'http://localhost:35879'; // Replace with your service's base URL
      const absoluteUrl = `${baseUrl}${docRecord.url}`;

      // Fetch the file content from the absolute URL


      // Fetch the file content from the provided URL
      const fileResponse = await axios.get(absoluteUrl, { responseType: 'arraybuffer' });

      // Validate media type
      if (docRecord.mediaType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          return req.reject(400, 'The file is not an Excel document');
      }

      // Process the Excel file
      const workbook = XLSX.read(fileResponse.data, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // Get the first sheet
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

          // Iterate over the JSON data and map to Invoice entity format
          const invoices = jsonData.map(row => ({
              po_no: row['PO Number'] || null,
              invoice_no: row['Invoice Number'] || null,
              date: row['Date'] ? new Date(row['Date']) : null,
              company_name: row['Company Name'] || null,
              Company_gst_no: row['Company GST No'] || null,
              bill_to: row['Bill To'] || null,
              ship_to: row['Ship To'] || null,
              bill_from_name: row['Bill From Name'] || null,
              bill_from_address: row['Bill From Address'] || null,
              bill_from_city: row['Bill From City'] || null,
              bill_from_zip: row['Bill From ZIP'] || null,
              bill_from_country: row['Bill From Country'] || null,
              payment_terms: row['Payment Terms'] || null,
              due_date: row['Due Date'] ? new Date(row['Due Date']) : null,
              sub_total: row['Subtotal'] || 0,
              discount: row['Discount'] || 0,
              discountPercent: row['Discount Percent'] || 0,
              tax: row['Tax'] || 0,
              shipping: row['Shipping'] || 0,
              total: row['Total'] || 0,
              amount_paid: row['Amount Paid'] || 0,
              balance_due: row['Balance Due'] || 0,
              Notes: row['Notes'] || null,
              Terms: row['Terms'] || null,
              Currency: row['Currency'] || null,
              mail_id: row['Mail ID'] || null,
              text: row['Text'] || null,
              bill_to_name: row['Bill To Name'] || null,
              bill_to_city: row['Bill To City'] || null,
              bill_to_address: row['Bill To Address'] || null,
              bill_to_zip: row['Bill To ZIP'] || null,
              bill_to_country: row['Bill To Country'] || null,
              template: row['Template'] || null,
          }));
  
          // Insert the invoices into the Invoice entity
          await INSERT.into('Invoice').entries(invoices);
  
          return req.reply({ message: `${invoices.length} invoices processed and stored.` });
      } catch (error) {
          console.error('Error processing file:', error);
          return req.reject(500, 'An error occurred while processing the file');
      }
  });

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

// Send mail 
    // this.on('POST','mail', async (req,next) => {
    //   const data = req.data
    //   const mailConfig = {
    //     to: 'shrenathuiux@gmail.com',
    //     subject: 'Test On Premise Destination',
    //     text: 'If you receive this e-mail, you are successful.'
    //   };
    //   sendMail({ destinationName: 'mail_destination' }, [mailConfig]);
    // console.log("working:",mailConfig)
    //   return next();
    // });
    

//  For Edit page to Invoice Entity
    // this.on('POST','Invoice', async (req,next) => {
    //   return next();
    // });

//  To Generate the PDF document and send it 
this.on('READ', 'PDFEntity', async (req, next) => {
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

          // Set metadata for the PDF
          const fileName = `Invoice_${po_no || pr_no}.pdf`;
          const contentType = 'application/pdf';

          // Generate the PDF content
          if(invoiceData.template == 1)
          {
            var bufferData = await generatePdfBufferTemplate_1(invoiceData);
          }
          else
          {
            var bufferData = await generatePdfBufferTemplate_2(invoiceData);
          }
          // const bufferData = await generatePdfBuffer(invoiceData);

          // Send mail if `mail_id` is available in the invoice
          const to = invoice.mail_id;
          const text = invoice.text;

          if (to) {
              try {
                  const mailConfig = {
                      to: to,
                      subject: fileName,
                      text: text,
                      attachments: [
                          {
                              filename: "test-filename",
                              content: bufferData,
                              contentType: contentType,
                          },
                      ],
                  };
                  await sendMail({ destinationName: 'mail_destination' }, [mailConfig]);
                  console.log("Email sent successfully.");
              } catch (mailError) {
                  console.error("Error sending email:", mailError);
              }
          }

          // Send the PDF as the response
          req._.res.writeHead(200, {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${fileName}"`,
          });
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


async function generatePdfBufferTemplate_2(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();

      // Determine the currency symbol
      let currency = invoice.Currency === "USD" ? '$' : '';
      console.log("Currency:", currency);

      // Header
      doc.autoTable({
        body: [
          [
            {
              content: `${invoice.company_name}`,
              styles: {
                halign: 'left',
                fontSize: 20,
                textColor: '#ffffff'
              }
            },
            {
              content: 'Invoice',
              styles: {
                halign: 'right',
                fontSize: 20,
                textColor: '#ffffff'
              }
            }
          ],
        ],
        theme: 'plain',
        styles: {
          fillColor: '#3366ff'
        }
      });

      // Invoice details
      doc.autoTable({
        body: [
          [
            {
              content: `Purchase Order No.: ${invoice.po_no}\nDate: ${invoice.date}\nInvoice number: ${invoice.invoice_no}`,
              styles: {
                halign: 'right'
              }
            }
          ],
        ],
        theme: 'plain'
      });

      // Billing and shipping addresses
      doc.autoTable({
        body: [
          [
            {
              content: `Billed to:\n${invoice.bill_to_name}\n${invoice.bill_to}\n${invoice.bill_to_zip} - ${invoice.bill_to_city}\n${invoice.bill_to_country}`,
              styles: {
                halign: 'left'
              }
            },
            {
              content: `From:\n${invoice.bill_from_name}\n${invoice.bill_from_address}\n${invoice.bill_from_zip} - ${invoice.bill_from_city}\n${invoice.bill_from_country}`,
              styles: {
                halign: 'right'
              }
            }
          ],
        ],
        theme: 'plain'
      });

      // Amount due
      doc.autoTable({
        body: [
          [
            {
              content: 'Amount due:',
              styles: {
                halign: 'right',
                fontSize: 14
              }
            }
          ],
          [
            {
              content: `${invoice.Currency}${invoice.balance_due}`,
              styles: {
                halign: 'right',
                fontSize: 20,
                textColor: '#3366ff'
              }
            }
          ],
          [
            {
              content: `Due date: ${invoice.due_date}`,
              styles: {
                halign: 'right'
              }
            }
          ]
        ],
        theme: 'plain'
      });

      // Products and services
      const items = invoice.items.map(item => [
        item.description,
        item.qty,
        `${invoice.Currency}${item.rate}`,
        `${invoice.Currency}${item.amount}`
      ]);
      doc.autoTable({
        head: [['Items', 'Quantity', 'Price', 'Amount']],
        body: items,
        theme: 'striped',
        headStyles: {
          fillColor: '#343a40'
        }
      });

      // Subtotal, tax, and total amount
      doc.autoTable({
        body: [
          [
            {
              content: 'Subtotal:',
              styles: {
                halign: 'right'
              }
            },
            {
              content: `${invoice.Currency}${invoice.sub_total}`,
              styles: {
                halign: 'right'
              }
            },
          ],
          [
            {
              content: 'Total tax:',
              styles: {
                halign: 'right'
              }
            },
            {
              content: `${invoice.Currency}${invoice.tax}`,
              styles: {
                halign: 'right'
              }
            },
          ],
          [
            {
              content: 'Total amount:',
              styles: {
                halign: 'right'
              }
            },
            {
              content: `${invoice.Currency}${invoice.total}`,
              styles: {
                halign: 'right'
              }
            },
          ],
        ],
        theme: 'plain'
      });

      // Terms and notes
      doc.autoTable({
        body: [
          [
            {
              content: 'Terms & notes',
              styles: {
                halign: 'left',
                fontSize: 14
              }
            }
          ],
          [
            {
              content: invoice.Notes,
              styles: {
                halign: 'left'
              }
            }
          ],
        ],
        theme: "plain"
      });

      // Footer
      doc.autoTable({
        body: [
          [
            {
              content: 'This is a centered footer',
              styles: {
                halign: 'center'
              }
            }
          ]
        ],
        theme: "plain"
      });

      const pdfBuffer = doc.output('arraybuffer');
      resolve(Buffer.from(pdfBuffer));
    } catch (error) {
      reject(error);
    }
  });
}



async function generatePdfBufferTemplate_1(invoice) {
  return new Promise((resolve, reject) => {
      try {
          const doc = new jsPDF('p', 'pt');

          // Company Details
        

          const fontSizes = {
              SubTitleFontSize: 12,
              NormalFontSize: 10,
          };

          const lineSpacing = {
              NormalSpacing: 12,
          };

          const rightStartCol1 = 400;
          const rightStartCol2 = 480;
          const startX = 40;
          let startY = 50;

 // Title
doc.setFont('helvetica', 'bold');
doc.setFontSize(fontSizes.SubTitleFontSize);
doc.text(String(invoice.company_name || 'Company Name Missing'), startX, startY += 30, 'left');

// Company Info
doc.setFontSize(fontSizes.NormalFontSize);
doc.text("GSTIN:", startX, startY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.Company_gst_no || 'GST No Missing'), 80, startY);

doc.setFont('helvetica', 'bold');
doc.text("PURCHASE ORDER NO. :", startX, startY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.po_no || 'PO No Missing'), 165, startY);

doc.setFont('helvetica', 'bold');
doc.text("PAYMENT TERMS :", startX, startY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.payment_terms || 'Payment Terms Missing'), 140, startY);

// Invoice Details
let tempY = startY - 30;
doc.setFont('helvetica', 'bold');
doc.text("INVOICE NO:", rightStartCol1, tempY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.invoice_no || 'Invoice No Missing'), rightStartCol2, tempY);

doc.setFont('helvetica', 'bold');
doc.text("INVOICE DATE:", rightStartCol1, tempY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.date || 'Invoice Date Missing'), rightStartCol2, tempY);

doc.setFont('helvetica', 'bold');
doc.text("DUE DATE:", rightStartCol1, tempY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.due_date || 'Due Date Missing'), rightStartCol2, tempY);

doc.setFont('helvetica', 'bold');
doc.text("BILL TO:", rightStartCol1, tempY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.bill_to_country || 'Bill To Missing'), rightStartCol2, tempY);

doc.setFont('helvetica', 'bold');
doc.text("SHIP TO:", rightStartCol1, tempY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.ship_to || 'Ship To Missing'), rightStartCol2, tempY);

doc.setFont('helvetica', 'bold');
doc.text("Currency:", rightStartCol1, tempY += lineSpacing.NormalSpacing);
doc.setFont('helvetica', 'normal');
doc.text(String(invoice.Currency || 'Currency Missing'), rightStartCol2, tempY);



          const columns = [
            { title: "Description", dataKey: "description" },
            { title: "Quantity", dataKey: "qty" },
            { title: "Rate", dataKey: "rate" },
            { title: "Amount", dataKey: "amount" },
        ];

        const rows = invoice.items.map(item => ({
            description: item.description,
            qty: item.qty.toString(),
            rate: item.rate.toString(),
            amount: item.amount.toString(),
        }));

        doc.autoTable({
            columns,
            body: rows,
            startY: startY + 50,
            styles: { fontSize: 8 },
        });
          // Footer
          startY = doc.lastAutoTable.finalY + 30;
          doc.setFont('helvetica', 'bold');
          doc.text("Sub Total:", rightStartCol1, startY);
          doc.text(String(invoice.sub_total || '0.00'), rightStartCol2, startY);
          
          doc.text("Tax Rs.:", rightStartCol1, startY += lineSpacing.NormalSpacing);
          doc.setFont('helvetica', 'normal');
          doc.text(String(invoice.tax || '0.00'), rightStartCol2, startY);
          
          doc.setFont('helvetica', 'bold');
          doc.text("Shipping Charges:", rightStartCol1, startY += lineSpacing.NormalSpacing);
          doc.setFont('helvetica', 'normal');
          doc.text(String(invoice.shipping || '0.00'), rightStartCol2 + 25, startY);
          
          doc.setFont('helvetica', 'bold');
          doc.text("Discount Percent:", rightStartCol1, startY += lineSpacing.NormalSpacing);
          doc.setFont('helvetica', 'normal');
          doc.text(String(invoice.discountPercent || '0.00'), rightStartCol2 + 25, startY);
          
          doc.setFont('helvetica', 'bold');
          doc.text("Grand Total Rs.:", rightStartCol1, startY += lineSpacing.NormalSpacing);
          doc.setFont('helvetica', 'normal');
          doc.text(String(invoice.total || '0.00'), rightStartCol2 + 25, startY);
          
          doc.setFont('helvetica', 'bold');
          doc.text("Amount Paid:", rightStartCol1, startY += lineSpacing.NormalSpacing);
          doc.setFont('helvetica', 'normal');
          doc.text(String(invoice.amount_paid || '0.00'), rightStartCol2 + 25, startY);
          
          doc.setFont('helvetica', 'bold');
          doc.text("Balance Rs.:", rightStartCol1, startY += lineSpacing.NormalSpacing);
          doc.setFont('helvetica', 'normal');
          doc.text(String(invoice.balance_due || '0.00'), rightStartCol2 + 25, startY);
          
          // Generate PDF Buffer
          const pdfBuffer = doc.output('arraybuffer');
          resolve(Buffer.from(pdfBuffer));
      } catch (error) {
          console.error('Error in PDF generation:', error);
          reject(error);
      }
  });
}


// Excel

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


