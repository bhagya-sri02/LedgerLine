/**
 * Utility to export JavaScript array of objects into a downloaded CSV file
 */
export const exportToCsv = (filename, rows, columns) => {
  if (!rows || !rows.length) {
    alert('No data available to export.');
    return;
  }

  // Header row
  const header = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  // Data rows
  const csvRows = rows.map((row) =>
    columns
      .map((col) => {
        let val = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
        if (val === null || val === undefined) val = '';
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(',')
  );

  const csvContent = [header, ...csvRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

