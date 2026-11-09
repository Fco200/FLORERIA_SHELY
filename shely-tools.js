(function () {
    const money = n => '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 }) + ' MXN';
    const rgb = h => { const n = parseInt(String(h || '#e35d6a').replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const phoneTxt = biz => `+52 ${String(biz.whatsapp || '').slice(2)}`;

    function base(biz, title) {
        const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
        const col = rgb(biz.color);
        doc.setFillColor(...col);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(biz.name, 14, 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`WhatsApp: ${phoneTxt(biz)}   |   Hermosillo, Sonora`, 14, 23);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(title, 14, 33);
        doc.setTextColor(30, 41, 59);
        return doc;
    }

    function np(doc, y, need) {
        if (y + need > 275) { doc.addPage(); return 20; }
        return y;
    }

    function section(doc, y, title, biz) {
        y = np(doc, y, 14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...rgb(biz.color));
        doc.text(title, 14, y);
        doc.setDrawColor(...rgb(biz.color));
        doc.line(14, y + 1.5, 196, y + 1.5);
        doc.setTextColor(30, 41, 59);
        return y + 8;
    }

    function row(doc, y, label, value) {
        const lines = doc.splitTextToSize(String(value || '—'), 130);
        y = np(doc, y, lines.length * 5 + 2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(lines, 60, y);
        return y + lines.length * 5 + 2;
    }

    function footer(doc, biz) {
        const n = doc.getNumberOfPages();
        for (let i = 1; i <= n; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(120, 130, 145);
            doc.text(`${biz.name} • ${phoneTxt(biz)} • Página ${i} de ${n}`, 105, 287, { align: 'center' });
        }
    }

    function orderPDF(o, biz) {
        const custom = !!o.custom;
        const doc = base(biz, custom ? 'Solicitud de pedido personalizado' : 'Ticket de pedido');
        let y = 50;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Folio: ${o.folio}`, 14, y);
        doc.text(`Estatus: ${o.status}`, 120, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Tipo: ${o.type || 'Pedido'}`, 14, y + 6);
        doc.text(`Registrado: ${o.dateCreated || ''} ${o.timestamp || ''}`, 120, y + 6);
        y += 16;

        y = section(doc, y, 'DATOS DEL CLIENTE', biz);
        y = row(doc, y, 'Nombre:', o.customer.name);
        y = row(doc, y, 'Teléfono:', o.customer.phone);
        y = row(doc, y, 'Dirección:', o.customer.address);
        y = row(doc, y, 'Entrega:', `${o.customer.date || ''} ${o.customer.time ? 'a las ' + o.customer.time + ' hrs' : ''}`);
        y += 4;

        if (custom) {
            const d = o.details || {};
            y = section(doc, y, 'DETALLE DE LA SOLICITUD', biz);
            y = row(doc, y, 'Tipo de evento:', d.tipo);
            y = row(doc, y, 'Tamaño / personas:', d.tamano);
            y = row(doc, y, 'Presupuesto:', d.presupuesto ? money(d.presupuesto) : 'Por definir');
            y = row(doc, y, 'Referencia:', d.referencia);
            y = row(doc, y, 'Descripción:', d.descripcion);
            y += 4;
            y = np(doc, y, 20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text('Total: Por cotizar. El anticipo del 50% se solicita al aprobar la cotización.', 14, y);
            y += 10;
        } else {
            y = section(doc, y, 'PRODUCTOS', biz);
            y = np(doc, y, 10);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setFillColor(241, 245, 249);
            doc.rect(14, y - 4.5, 182, 7, 'F');
            doc.text('Cant.', 16, y);
            doc.text('Producto', 32, y);
            doc.text('Precio', 140, y);
            doc.text('Subtotal', 194, y, { align: 'right' });
            y += 7;
            doc.setFont('helvetica', 'normal');
            o.items.forEach(i => {
                y = np(doc, y, 8);
                const name = doc.splitTextToSize(i.name, 100);
                doc.text(String(i.qty), 16, y);
                doc.text(name, 32, y);
                doc.text(money(i.price), 140, y);
                doc.text(money(i.price * i.qty), 194, y, { align: 'right' });
                y += name.length * 5 + 2;
            });
            y += 2;
            doc.setDrawColor(203, 213, 225);
            doc.line(120, y, 196, y);
            y += 6;
            const saldo = o.total - o.anticipo;
            [['Total', money(o.total)], ['Anticipo (50%)', money(o.anticipo)], ['Saldo al entregar', money(saldo)]].forEach(([k, v], idx) => {
                doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
                doc.text(k, 120, y);
                doc.text(v, 196, y, { align: 'right' });
                y += 6;
            });
            y += 6;
        }

        y = section(doc, y, 'DEDICATORIA Y PAGO', biz);
        y = row(doc, y, 'Dedicatoria / nota:', o.customer.note || 'Sin dedicatoria');
        if (!custom) {
            y = row(doc, y, 'Banco:', 'BBVA');
            y = row(doc, y, 'CLABE:', biz.clabe);
            y = row(doc, y, 'Titular:', biz.name);
        }
        y += 6;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Gracias por preferir ${biz.name}.`, 105, np(doc, y, 10), { align: 'center' });

        footer(doc, biz);
        return doc;
    }

    function catalogPDF(products, biz) {
        const doc = base(biz, 'Catálogo de productos');
        const list = products.filter(p => !p.hidden);
        let y = 50;
        if (!list.length) {
            doc.setFontSize(11);
            doc.text('Próximamente nuevos productos.', 14, y);
        }
        [...new Set(list.map(p => p.category))].forEach(cat => {
            y = section(doc, y, cat.toUpperCase(), biz);
            list.filter(p => p.category === cat).forEach(p => {
                const desc = doc.splitTextToSize(p.description || '', 150);
                y = np(doc, y, 14 + desc.length * 5);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(p.name, 14, y);
                doc.text(money(p.price), 196, y, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(p.status === 'Agotado' ? 225 : 16, p.status === 'Agotado' ? 29 : 185, p.status === 'Agotado' ? 72 : 129);
                doc.text(p.status === 'Agotado' ? 'AGOTADO' : 'Disponible', 14, y + 5);
                doc.setTextColor(71, 85, 105);
                doc.setFontSize(9);
                doc.text(desc, 14, y + 10);
                doc.setTextColor(30, 41, 59);
                y += 14 + desc.length * 5;
            });
            y += 4;
        });
        y = np(doc, y, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Para hacer tu pedido escríbenos a ${phoneTxt(biz)}.`, 14, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.text('Pedidos personalizados disponibles: cotización sin compromiso.', 14, y + 10);
        footer(doc, biz);
        return doc;
    }

    function download(doc, filename) {
        doc.save(filename);
    }

    async function sendPDF(doc, filename, text, phone) {
        const file = new File([doc.output('blob')], filename, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title: filename, text });
                return 'shared';
            } catch (e) {
                if (e.name === 'AbortError') return 'cancelled';
            }
        }
        doc.save(filename);
        setTimeout(() => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text + '\n\n📎 Adjunto el PDF descargado.')}`, '_blank'), 800);
        return 'downloaded';
    }

    function statusMessage(o, biz) {
        const n = (o.customer.name || '').split(' ')[0];
        const head = `${biz.emoji || ''} *${biz.name}*\n`;
        const det = o.items.map(i => `   • ${i.qty}x ${i.name}${i.price ? ` — ${money(i.price * i.qty)}` : ''}`).join('\n');
        const entrega = `${o.customer.date || ''}${o.customer.time ? ' a las ' + o.customer.time + ' hrs' : ''}`;
        const sig = `\n\n📞 Dudas: ${phoneTxt(biz)}\n_Gracias por preferir ${biz.name}._`;

        if (o.custom) {
            if (o.status === 'Confirmado') return head + `\n✅ *Diseño aprobado*\n\nHola ${n}, tu pedido personalizado *${o.folio}* (${o.details?.tipo || 'evento'}) entra a producción.\n\n📅 *Entrega:* ${entrega}\n📍 *Dirección:* ${o.customer.address}\n\nPara reservar tu fecha, envía el anticipo del 50% a:\nBBVA | CLABE: ${biz.clabe}\nTitular: ${biz.name}` + sig;
            if (o.status === 'Entregado') return head + `\n🎉 *¡Entregado!*\n\nHola ${n}, tu pedido personalizado *${o.folio}* fue entregado. ¡Gracias por confiar en nosotros! ✨` + sig;
            return head + `\n📝 *Solicitud recibida*\n\nHola ${n}, recibimos tu solicitud personalizada *${o.folio}*.\n\nEn breve te enviaremos la cotización. Si quieres agregar medidas, presupuesto o fotos de referencia, responde este mensaje.` + sig;
        }

        if (o.status === 'Confirmado') return head + `\n✅ *¡Pedido confirmado!*\n\nHola ${n}, recibimos tu anticipo y ya estamos preparando tu pedido *${o.folio}* con mucho cuidado.\n\n📦 *Productos:*\n${det}\n\n📅 *Entrega:* ${entrega}\n📍 *Dirección:* ${o.customer.address}\n💬 *Dedicatoria:* "${o.customer.note}"\n\n💰 Total: ${money(o.total)}\n✔ Anticipo pagado: ${money(o.anticipo)}\n⏳ Saldo al entregar: ${money(o.total - o.anticipo)}` + sig;
        if (o.status === 'Entregado') return head + `\n🎉 *¡Pedido entregado!*\n\nHola ${n}, tu pedido *${o.folio}* fue entregado con éxito. ¡Esperamos que te encante! ✨\n\nGracias por tu preferencia.` + sig;
        return head + `\n🛎 *Pedido recibido*\n\nHola ${n}, recibimos tu pedido *${o.folio}*.\n\n📦 *Productos:*\n${det}\n\n📅 *Entrega:* ${entrega}\n💰 Total: ${money(o.total)}\n🔒 *Anticipo 50%:* ${money(o.anticipo)}\n\n*Para confirmar tu pedido envía el anticipo a:*\nBBVA | CLABE: ${biz.clabe}\nTitular: ${biz.name}\n\nEnvíanos el comprobante por este medio.` + sig;
    }

    window.ShelyTools = { money, orderPDF, catalogPDF, download, sendPDF, statusMessage };
})();
