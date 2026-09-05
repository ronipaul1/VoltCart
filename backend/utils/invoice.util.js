const PDFDocument = require('pdfkit');

const COLORS = {
  navy: '#0f172a',
  cyan: '#06b6d4',
  cyanDark: '#0891b2',
  cyanLight: '#ecfeff',
  surface: '#f8fafc',
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  white: '#ffffff',
  red: '#dc2626',
  redLight: '#fef2f2',
  emerald: '#059669',
  emeraldLight: '#ecfdf5',
};

const money = (value) => `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const safe = (value, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

// ─── 1. INVOICE GENERATOR (Customer & Admin) ───────────────────────────────────

exports.generateInvoicePDF = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    const buffers = [];

    doc.info.Title = `Invoice ${safe(order.invoice_number || order.order_number, '')}`;
    doc.info.Author = 'VoltCart Electronics';
    doc.info.Subject = 'Official Tax Invoice';

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const drawHeader = (d) => {
      const { width, height } = d.page;
      d.rect(0, 0, width, height).fill(COLORS.white);

      // Top brand bar
      d.rect(0, 0, width, 8).fill(COLORS.cyan);

      // Logo and Store Info
      d.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(24).text('VoltCart', 40, 32);
      d.fillColor(COLORS.cyanDark).font('Helvetica-Bold').fontSize(9).text('EVERYTHING TECH, ONE CART', 40, 58);
      d.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
        .text('VoltCart Technologies Pvt Ltd', 40, 72)
        .text('108 Tech Park Boulevard, Electronic City, Bengaluru 560100', 40, 83)
        .text('GSTIN: 29ABCDE1234F1Z5 | support@voltcart.com | +91 80 4567 8900', 40, 94);

      // Invoice Title & Meta Card
      d.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(20).text('TAX INVOICE', 380, 32, { align: 'right', width: 175 });

      const invoiceNum = safe(order.invoice_number, `INV-VC-${new Date().getFullYear()}-${safe(order.order_number, '000001').slice(-6)}`);
      d.roundedRect(360, 58, 195, 50, 4).fill(COLORS.surface).stroke(COLORS.line);
      d.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('INVOICE NO:', 372, 66);
      d.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(invoiceNum, 440, 66);

      d.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('INVOICE DATE:', 372, 79);
      d.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(formatDate(order.invoice_generated_at || order.created_at), 440, 79);

      d.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('ORDER ID:', 372, 92);
      d.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(safe(order.order_number, 'N/A'), 440, 92);
    };

    drawHeader(doc);

    // Bill To and Ship To
    const boxY = 122;
    doc.roundedRect(40, boxY, 250, 90, 4).fill(COLORS.surface).stroke(COLORS.line);
    doc.roundedRect(305, boxY, 250, 90, 4).fill(COLORS.surface).stroke(COLORS.line);

    doc.fillColor(COLORS.cyanDark).font('Helvetica-Bold').fontSize(9).text('BILL TO', 52, boxY + 10);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(10).text(safe(order.full_name || order.customer_name, 'Customer'), 52, boxY + 24, { width: 226 });
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8)
      .text(safe(order.email || order.customer_email, ''), 52, boxY + 38, { width: 226 })
      .text(`Phone: ${safe(order.phone || order.addr_phone || order.customer_phone, 'N/A')}`, 52, boxY + 50, { width: 226 })
      .text(`${safe(order.city || '')}, ${safe(order.state || '')} - ${safe(order.pincode || '')}`, 52, boxY + 62, { width: 226 });

    doc.fillColor(COLORS.cyanDark).font('Helvetica-Bold').fontSize(9).text('SHIP TO', 317, boxY + 10);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(10).text(safe(order.full_name || order.customer_name, 'Recipient'), 317, boxY + 24, { width: 226 });
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8)
      .text(safe(order.address_line1 || order.address, ''), 317, boxY + 38, { width: 226, ellipsis: true })
      .text(safe(order.address_line2, ''), 317, boxY + 50, { width: 226, ellipsis: true })
      .text(`${safe(order.city || '')}, ${safe(order.state || '')} - ${safe(order.pincode || '')}, ${safe(order.country, 'India')}`, 317, boxY + 62, { width: 226 });

    // Table Header
    let y = 224;
    doc.roundedRect(40, y, 515, 24, 4).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8);
    doc.text('ITEM & SPECIFICATIONS', 50, y + 8, { width: 190 });
    doc.text('SKU', 245, y + 8, { width: 75 });
    doc.text('QTY', 325, y + 8, { width: 30, align: 'center' });
    doc.text('UNIT PRICE', 360, y + 8, { width: 65, align: 'right' });
    doc.text('GST / TAX', 430, y + 8, { width: 55, align: 'right' });
    doc.text('TOTAL', 490, y + 8, { width: 55, align: 'right' });

    y += 28;

    const items = order.items || [];
    items.forEach((item, index) => {
      if (y > 670) {
        doc.addPage();
        drawHeader(doc);
        y = 130;
      }

      const bg = index % 2 === 0 ? COLORS.white : COLORS.surface;
      doc.roundedRect(40, y, 515, 34, 2).fill(bg).stroke(COLORS.line);

      doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8)
        .text(safe(item.name || item.product_name, 'Product'), 50, y + 7, { width: 190, ellipsis: true });
      
      const variantStr = item.variant ? Object.values(item.variant).filter(Boolean).join(', ') : '';
      if (variantStr) {
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
          .text(`Variant: ${variantStr}`, 50, y + 19, { width: 190, ellipsis: true });
      }

      const itemSku = safe(item.sku || `VC-${String(item.productId || item.product_id || index + 1).padStart(4, '0')}`);
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(itemSku, 245, y + 12, { width: 75, ellipsis: true });
      doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8).text(safe(item.quantity, 1), 325, y + 12, { width: 30, align: 'center' });
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8).text(money(item.price || item.unit_price), 360, y + 12, { width: 65, align: 'right' });
      
      const gstVal = item.gst_amount || ((Number(item.price || 0) * 0.18) * Number(item.quantity || 1));
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8).text(money(gstVal), 430, y + 12, { width: 55, align: 'right' });

      const lineTotal = Number(item.price || item.unit_price || 0) * Number(item.quantity || 1);
      doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8).text(money(lineTotal), 490, y + 12, { width: 55, align: 'right' });

      y += 38;
    });

    // Summary & Payment Box
    y += 10;
    if (y > 640) {
      doc.addPage();
      drawHeader(doc);
      y = 130;
    }

    // Payment info card on the left
    doc.roundedRect(40, y, 250, 95, 4).fill(COLORS.surface).stroke(COLORS.line);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text('PAYMENT INFORMATION', 52, y + 10);
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8)
      .text(`Method: ${safe(order.paymentMethod || order.payment_method, 'Online Payment')}`, 52, y + 26)
      .text(`Payment Status: ${safe(order.paymentStatus || order.payment_status, 'Paid').toUpperCase()}`, 52, y + 38)
      .text(`Transaction ID: ${safe(order.paymentId || order.razorpay_payment_id || 'N/A')}`, 52, y + 50)
      .text(`Shipping Method: ${safe(order.shippingMethod?.service || order.shippo_service_level || 'Standard Delivery')}`, 52, y + 62)
      .text(`Tracking No: ${safe(order.trackingNumber || order.tracking_number || 'Will be updated upon dispatch')}`, 52, y + 74);

    // Totals card on the right
    const summaryX = 305;
    doc.roundedRect(summaryX, y, 250, 95, 4).fill(COLORS.white).stroke(COLORS.line);

    const subtotalVal = order.subtotal || items.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 1), 0);
    const discountVal = Number(order.coupon?.discount || order.discount_amount || 0);
    const shippingVal = Number(order.shippingMethod?.cost || order.shipping_amount || 0);
    const taxVal = Number(order.tax || order.gst_amount || (subtotalVal * 0.18));
    const grandTotal = order.total || order.total_amount || (subtotalVal - discountVal + shippingVal + taxVal);

    const renderLine = (label, val, offset, isBold = false) => {
      doc.fillColor(isBold ? COLORS.navy : COLORS.muted).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 9 : 8)
        .text(label, summaryX + 12, y + offset);
      doc.fillColor(isBold ? COLORS.cyanDark : COLORS.text).font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 10 : 8)
        .text(val, summaryX + 120, y + offset, { width: 118, align: 'right' });
    };

    renderLine('Subtotal:', money(subtotalVal), 10);
    if (discountVal > 0) renderLine('Coupon Discount:', `- ${money(discountVal)}`, 24);
    renderLine('Shipping & Handling:', shippingVal === 0 ? 'FREE' : money(shippingVal), 38);
    renderLine('Estimated GST (18%):', money(taxVal), 52);
    doc.rect(summaryX + 10, y + 68, 230, 1).fill(COLORS.line);
    renderLine('Grand Total:', money(grandTotal), 74, true);

    // Footer
    const footerY = 770;
    doc.rect(40, footerY - 10, 515, 1).fill(COLORS.line);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8)
      .text('Thank you for shopping with VoltCart.', 40, footerY, { align: 'center', width: 515 });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
      .text('This is an authentic computer-generated tax invoice. For warranty claims, keep this document safe.', 40, footerY + 12, { align: 'center', width: 515 })
      .text('VoltCart Support: support@voltcart.com | Helpline: +91 80 4567 8900 | www.voltcart.com', 40, footerY + 22, { align: 'center', width: 515 });

    doc.end();
  });
};

// ─── 2. PACKING SLIP GENERATOR (Admin Only) ───────────────────────────────────

exports.generatePackingSlipPDF = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
    const buffers = [];

    doc.info.Title = `Packing Slip ${safe(order.order_number, '')}`;
    doc.info.Author = 'VoltCart Warehouse Fulfillment';
    doc.info.Subject = 'Internal Warehouse Packing Slip — ADMIN ONLY';

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const { width, height } = doc.page;
    doc.rect(0, 0, width, height).fill(COLORS.white);

    // Top Header Banner
    doc.rect(0, 0, width, 55).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(20).text('VoltCart', 40, 18);
    doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(14).text('PACKING SLIP', 220, 22);
    doc.fillColor(COLORS.white).font('Helvetica').fontSize(8).text('WAREHOUSE FULFILLMENT COPY (ADMIN ONLY)', 360, 26, { align: 'right', width: 195 });

    // Order Info Panel
    const topY = 70;
    doc.roundedRect(40, topY, 515, 60, 4).fill(COLORS.surface).stroke(COLORS.line);

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('VOLTCART ORDER ID:', 52, topY + 10);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(11).text(safe(order.orderNumber || order.order_number, 'N/A'), 52, topY + 22);

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('ORDER DATE:', 200, topY + 10);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(formatDate(order.createdAt || order.created_at), 200, topY + 22);

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('CUSTOMER NAME:', 310, topY + 10);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(safe(order.customer || order.full_name || order.customer_name, 'Customer'), 310, topY + 22);

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('SHIPPING METHOD:', 440, topY + 10);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(safe(order.shippingMethod?.service || order.shippo_service_level || 'Standard'), 440, topY + 22);

    // Delivery Address Card
    const addrY = 140;
    doc.roundedRect(40, addrY, 515, 45, 4).stroke(COLORS.line);
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('DESTINATION ADDRESS:', 52, addrY + 8);
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8)
      .text(safe(order.address || `${order.address_line1 || ''}, ${order.city || ''} ${order.state || ''} ${order.pincode || ''}`), 52, addrY + 20, { width: 490 });

    // Check if fragile
    const items = order.items || [];
    const hasFragile = items.some((i) => i.isFragile || i.is_fragile || ['smartphones', 'laptops', 'tablets', 'cameras'].includes(i.product?.category));

    let currentY = 195;
    if (hasFragile) {
      doc.roundedRect(40, currentY, 515, 26, 4).fill(COLORS.redLight).stroke(COLORS.red);
      doc.fillColor(COLORS.red).font('Helvetica-Bold').fontSize(9)
        .text('WARNING: FRAGILE — HANDLE WITH CARE (Package contains sensitive electronics)', 52, currentY + 8);
      currentY += 34;
    }

    // Checklist Header
    doc.roundedRect(40, currentY, 515, 24, 4).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8);
    doc.text('VERIFY', 50, currentY + 8, { width: 40 });
    doc.text('PRODUCT NAME & DESCRIPTION', 100, currentY + 8, { width: 230 });
    doc.text('SKU', 340, currentY + 8, { width: 90 });
    doc.text('VARIANT / CONFIG', 435, currentY + 8, { width: 60 });
    doc.text('QTY', 505, currentY + 8, { width: 40, align: 'center' });

    currentY += 28;

    let totalUnits = 0;
    items.forEach((item, index) => {
      totalUnits += Number(item.quantity || 1);
      const bg = index % 2 === 0 ? COLORS.white : COLORS.surface;
      doc.roundedRect(40, currentY, 515, 36, 2).fill(bg).stroke(COLORS.line);

      // Checkbox box
      doc.roundedRect(56, currentY + 11, 14, 14, 2).stroke(COLORS.navy);

      doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9)
        .text(safe(item.name || item.product_name, 'Product Item'), 100, currentY + 8, { width: 230, ellipsis: true });

      const itemSku = safe(item.sku || item.product?.sku || `VC-SKU-${String(item.productId || index + 1).padStart(4, '0')}`);
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(itemSku, 340, currentY + 12, { width: 90 });

      const variantStr = item.variant ? Object.values(item.variant).filter(Boolean).join(', ') : 'Standard';
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(8).text(variantStr, 435, currentY + 12, { width: 60, ellipsis: true });

      doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(11).text(safe(item.quantity, 1), 505, currentY + 10, { width: 40, align: 'center' });

      currentY += 40;
    });

    // Checklist Summary Block
    currentY += 10;
    doc.roundedRect(40, currentY, 515, 45, 4).fill(COLORS.surface).stroke(COLORS.line);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9)
      .text(`Total Distinct Products: ${items.length}`, 52, currentY + 12)
      .text(`Total Package Units: ${totalUnits}`, 220, currentY + 12);

    const estWeight = items.reduce((sum, i) => sum + (Number(i.weight || 0.5) * Number(i.quantity || 1)), 0);
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8)
      .text(`Calculated Weight: ~${estWeight.toFixed(2)} kg`, 52, currentY + 28)
      .text('Packaging Material: Anti-static foam + Bubblewrap cushion + VoltCart outer carton', 220, currentY + 28);

    // Sign-off verification section
    currentY += 60;
    doc.roundedRect(40, currentY, 515, 110, 4).stroke(COLORS.line);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text('WAREHOUSE PACKING & DISPATCH SIGN-OFF', 52, currentY + 12);
    
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text('Packed By (Signature): ____________________________', 52, currentY + 40)
      .text('Checked & Verified By: ____________________________', 52, currentY + 70)
      .text('Packing Date & Time: __________________', 330, currentY + 40)
      .text('Carton Seal No: ______________________', 330, currentY + 70);

    doc.end();
  });
};

// ─── 3. SHIPPING LABEL GENERATOR (Admin Only) ──────────────────────────────────

exports.generateShippingLabelPDF = (order) => {
  return new Promise((resolve, reject) => {
    // 4x6 inch thermal format (288 x 432 pt)
    const doc = new PDFDocument({ margin: 0, size: [288, 432] });
    const buffers = [];

    doc.info.Title = `Shipping Label ${safe(order.order_number || order.orderNumber, '')}`;
    doc.info.Author = 'VoltCart Shipping';
    doc.info.Subject = 'Thermal Parcel Shipping Label';

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Background
    doc.rect(0, 0, 288, 432).fill(COLORS.white);

    // Brand Header
    doc.rect(0, 0, 288, 42).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(16).text('VoltCart', 16, 12);
    doc.fillColor(COLORS.cyan).font('Helvetica-Bold').fontSize(9).text('PRIORITY DISPATCH', 160, 16, { align: 'right', width: 112 });

    // Carrier Bar
    const carrier = safe(order.shippingMethod?.carrier || order.carrier || order.shippo_tracking_carrier || 'BLUE DART EXPRESS').toUpperCase();
    const service = safe(order.shippingMethod?.service || order.service || order.shippo_service_level || 'AIR CARGO SURFACE').toUpperCase();
    
    doc.rect(14, 48, 260, 26).fill(COLORS.surface).stroke(COLORS.line);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text(`CARRIER: ${carrier}`, 20, 56);
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(service, 160, 56, { align: 'right', width: 106 });

    // FROM (Origin)
    doc.roundedRect(14, 80, 260, 54, 3).stroke(COLORS.line);
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7).text('FROM (ORIGIN):', 20, 86);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8).text('VoltCart Central Fulfillment', 20, 96);
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(7)
      .text('108 Tech Park Boulevard, Electronic City, Bengaluru, KA - 560100', 20, 107, { width: 248 })
      .text('Helpline: +91 80 4567 8900 | GSTIN: 29ABCDE1234F1Z5', 20, 118, { width: 248 });

    // SHIP TO (Destination - Primary Focus)
    doc.roundedRect(14, 140, 260, 105, 3).fill(COLORS.surface).stroke(COLORS.navy);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(9).text('SHIP TO:', 20, 148);

    const recipientName = safe(order.full_name || order.customer || order.customer_name, 'Recipient');
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(11).text(recipientName, 20, 160, { width: 248, ellipsis: true });

    const addrLine = safe(order.address || `${order.address_line1 || ''}, ${order.address_line2 || ''}`);
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(8)
      .text(addrLine, 20, 175, { width: 248, ellipsis: true })
      .text(`${safe(order.city || '')}, ${safe(order.state || '')}`, 20, 187, { width: 248 })
      .text(`Phone: ${safe(order.phone || order.addr_phone || order.customer_phone, 'N/A')}`, 20, 199, { width: 248 });

    // Prominent Postal Code for automated parcel sorting
    const pincode = safe(order.pincode || order.postalCode || '560001');
    doc.roundedRect(165, 205, 100, 28, 3).fill(COLORS.navy);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(14).text(pincode, 165, 212, { align: 'center', width: 100 });

    // Tracking & Barcode Simulation
    const trackingNum = safe(order.trackingNumber || order.tracking_number || `VC${Date.now().toString().slice(-8)}IN`);
    doc.rect(14, 252, 260, 78).stroke(COLORS.line);
    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7).text('TRACKING NUMBER / AWB:', 20, 258);
    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(11).text(trackingNum, 20, 268, { align: 'center', width: 248 });

    // Draw simulated barcode lines
    let barX = 28;
    const barcodeY = 285;
    const barcodeHeight = 36;
    for (let i = 0; i < 46; i++) {
      const barW = (i % 3 === 0 || i % 7 === 0) ? 3 : (i % 5 === 0 ? 2 : 1);
      doc.rect(barX, barcodeY, barW, barcodeHeight).fill(COLORS.navy);
      barX += barW + ((i % 4 === 0) ? 3 : 2);
      if (barX > 260) break;
    }

    // Package details & Fragile Notice
    doc.roundedRect(14, 336, 260, 48, 3).fill(COLORS.surface).stroke(COLORS.line);
    doc.fillColor(COLORS.text).font('Helvetica').fontSize(7)
      .text(`Order ID: ${safe(order.orderNumber || order.order_number, 'N/A')}`, 20, 342)
      .text(`Date: ${formatDate(order.createdAt || order.created_at)}`, 20, 353)
      .text(`Payment: ${safe(order.paymentMethod || order.payment_method, 'Prepaid').toUpperCase()}`, 20, 364);

    const items = order.items || [];
    const totalItems = items.reduce((s, i) => s + Number(i.quantity || 1), 0);
    const totalWeight = order.package_weight || items.reduce((s, i) => s + (Number(i.weight || 0.5) * Number(i.quantity || 1)), 0);

    doc.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(8)
      .text(`Items: ${totalItems} | Weight: ${Number(totalWeight).toFixed(2)} kg`, 130, 342, { align: 'right', width: 136 })
      .text('Dimensions: 30 x 20 x 15 cm', 130, 353, { align: 'right', width: 136 });

    const hasFragile = items.some((i) => i.isFragile || i.is_fragile || ['smartphones', 'laptops', 'tablets', 'cameras'].includes(i.product?.category));
    if (hasFragile) {
      doc.roundedRect(14, 390, 260, 26, 3).fill(COLORS.redLight).stroke(COLORS.red);
      doc.fillColor(COLORS.red).font('Helvetica-Bold').fontSize(9)
        .text('FRAGILE — HANDLE WITH CARE', 14, 398, { align: 'center', width: 260 });
    } else {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
        .text('Standard Electronic Parcel. Keep Dry.', 14, 398, { align: 'center', width: 260 });
    }

    doc.end();
  });
};
