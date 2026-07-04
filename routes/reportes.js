const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

router.get('/precios/excel', requireAuth, async (req, res) => {
  try {
    const precios = db.all('SELECT * FROM precios ORDER BY precio_bs DESC');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Precios');

    sheet.columns = [
      { header: 'Beneficiadora', key: 'beneficiadora', width: 30 },
      { header: 'Zona', key: 'zona', width: 18 },
      { header: 'Precio (Bs/qq)', key: 'precio_bs', width: 16 },
      { header: 'Calidad', key: 'calidad', width: 16 },
      { header: 'Verificado', key: 'verificado', width: 12 },
      { header: 'Fecha', key: 'fecha_hora', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };

    precios.forEach((p) => {
      sheet.addRow({
        beneficiadora: p.beneficiadora,
        zona: p.zona,
        precio_bs: p.precio_bs,
        calidad: p.calidad,
        verificado: p.verificado ? 'Sí' : 'No',
        fecha_hora: p.fecha_hora,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_arrozmax.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar el Excel.' });
  }
});

router.get('/precios/pdf', requireAuth, (req, res) => {
  try {
    const precios = db.all('SELECT * FROM precios ORDER BY precio_bs DESC');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_arrozmax.pdf');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text('ArrozMax — Reporte de precios', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#5B6B60').text(`Generado: ${new Date().toLocaleString('es-BO')}`);
    doc.moveDown(1);
    doc.fillColor('#000000');

    const colX = [40, 250, 340, 440];
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Beneficiadora', colX[0], doc.y, { continued: false });
    doc.text('Zona', colX[1], doc.y - doc.currentLineHeight());
    doc.text('Precio (Bs)', colX[2], doc.y - doc.currentLineHeight());
    doc.text('Calidad', colX[3], doc.y - doc.currentLineHeight());
    doc.moveDown(0.5);
    doc.font('Helvetica');

    precios.forEach((p) => {
      const y = doc.y;
      doc.text(p.beneficiadora, colX[0], y, { width: 200 });
      doc.text(p.zona, colX[1], y);
      doc.text(String(p.precio_bs), colX[2], y);
      doc.text(p.calidad, colX[3], y);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al generar el PDF.' });
  }
});

module.exports = router;
