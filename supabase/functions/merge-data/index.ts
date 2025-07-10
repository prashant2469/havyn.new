import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parse as parseCSV } from "npm:csv-parse/sync";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const safeFloat = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[$,]/g, '').trim();
  if (!str) return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const normalizeForKey = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const cleanName = (name: string): string => {
  if (!name) return '';
  if (name.includes(',')) {
    const [lastName, firstPart] = name.split(',').map(part => part.trim());
    const parts = firstPart.split(' ').filter(Boolean);
    return normalizeForKey(`${parts.join(' ')} ${lastName}`);
  }
  return normalizeForKey(name);
};

const formatName = (name: string): string => {
  if (!name) return '';
  if (name.includes(',')) {
    const [lastName, firstPart] = name.split(',').map(part => part.trim());
    const parts = firstPart.split(' ').filter(Boolean);
    return `${parts.join(' ')} ${lastName}`;
  }
  return name.trim().replace(/\s+/g, ' ');
};

const calculateTenureMonths = (moveInDate: string): number => {
  if (!moveInDate) return 0;
  try {
    const moveIn = new Date(moveInDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - moveIn.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24 * 30));
  } catch {
    return 0;
  }
};

const decodeBase64ToCSV = (base64String: string): any[] => {
  try {
    const text = new TextDecoder().decode(
      Uint8Array.from(atob(base64String), c => c.charCodeAt(0))
    );
    return parseCSV(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    console.error('Error decoding/parsing CSV:', error);
    throw new Error('Invalid CSV data');
  }
};

const filterEmptyValues = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith('aging') && key !== 'delinquentRent') {
      result[key] = value;
      continue;
    }
    
    if (typeof value === 'number' && value > 0) {
      result[key] = value;
    }
  }
  return result;
};

const processCombinedReport = (data: any[]): any[] => {
  return data
    .filter(row => {
      // Skip rows without required fields
      if (!row.Property || !row.Unit || !row.Tenant || !row.Rent) return false;

      // Skip if unit contains "Units" or is a summary row
      if (row.Unit.toLowerCase().includes('units')) return false;

      // Only include rows where Status is exactly 'Current'
      if (row.Status !== 'Current') return false;

      // Skip if property name matches unit (summary rows)
      const propertyName = row.Property?.trim();
      const unitName = row.Unit?.trim();
      if (propertyName === unitName) return false;

      // Skip if the row contains summary keywords
      const summaryKeywords = ['total units', 'total occupied', 'total vacant', 'total'];
      const unitLower = unitName.toLowerCase();
      if (summaryKeywords.some(keyword => unitLower.includes(keyword))) return false;

      // Skip rows that only have property value and most other fields empty
      const nonEmptyFields = Object.entries(row).filter(([key, value]) => {
        if (key === 'Property') return false; // Exclude Property from count
        return value !== null && value !== undefined && value.toString().trim() !== '';
      }).length;

      if (nonEmptyFields <= 1) return false;

      return true;
    })
    .map(row => {
      const tenant = formatName(row.Tenant || '');
      const property = row.Property?.trim();
      const unit = row.Unit?.trim();
      const tenureMonths = calculateTenureMonths(row['Move-in']);

      return {
        property,
        unit,
        tenant,
        rentAmount: safeFloat(row.Rent),
        marketRent: safeFloat(row['Market Rent']),
        pastDue: safeFloat(row['Past Due']),
        delinquentRent: safeFloat(row['Delinquent Rent']),
        amountReceivable: safeFloat(row['Amount Receivable']),
        aging30: safeFloat(row['0-30']),
        aging60: safeFloat(row['30-60']),
        aging90: safeFloat(row['60-90']),
        agingOver90: safeFloat(row['90+']),
        delinquencyNotes: row['Delinquency Notes'] || '',
        lateCount: safeFloat(row['Late Count']),
        tenureMonths,
        latePaymentRate: tenureMonths > 0 ? (safeFloat(row['Late Count']) || 0) / tenureMonths : 0,
        leaseEndDate: row['Lease To'] || '',
        moveInDate: row['Move-in'] || '',
        phoneNumbers: row['Phone Numbers'] || row['Phone'] || '',
        emails: row['Emails'] || row['Email'] || ''
      };
    });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();

    let mergedRecords;
    if (requestData.combined) {
      const csvData = decodeBase64ToCSV(requestData.combined);
      mergedRecords = processCombinedReport(csvData);
    } else {
      const { delinquency, rent_roll, tenant_directory } = requestData;

      if (!delinquency || !rent_roll || !tenant_directory) {
        throw new Error('Missing required files');
      }

      const delinquencyData = decodeBase64ToCSV(delinquency);
      const rentRollData = decodeBase64ToCSV(rent_roll);
      const directoryData = decodeBase64ToCSV(tenant_directory);

      const delinquencyMap = new Map();
      const directoryMap = new Map();

      for (const record of delinquencyData) {
        if (!record) continue;
        
        const tenant = formatName(record.Name || record.Tenant || '');
        const property = record.Property?.trim();
        const unit = record.Unit?.trim();
        
        if (!tenant || !property || !unit) continue;
        
        const key = `${property}-${unit}-${cleanName(tenant)}`;
        
        delinquencyMap.set(key, {
          amountReceivable: safeFloat(record['Amount Receivable']),
          delinquentRent: safeFloat(record['Delinquent Rent']),
          delinquencyNotes: record['Delinquency Notes'] || '',
          aging30: safeFloat(record['0-30']),
          aging60: safeFloat(record['30-60']),
          aging90: safeFloat(record['60-90']),
          agingOver90: safeFloat(record['90+']),
          delinquentSubsidyAmount: safeFloat(record['Delinquent Subsidy Amount'])
        });
      }

      for (const record of directoryData) {
        if (!record || record.Status !== 'Current') continue;
        
        const property = record.Property?.trim();
        const unit = record.Unit?.trim();
        let tenant;

        if (record.Tenant) {
          tenant = formatName(record.Tenant);
        } else if (record['First Name'] && record['Last Name']) {
          tenant = `${record['First Name'].trim()} ${record['Last Name'].trim()}`;
        } else if (record.Name) {
          tenant = formatName(record.Name);
        }
        
        if (!tenant || !property || !unit) continue;
        
        const key = `${property}-${unit}-${cleanName(tenant)}`;
        
        const phoneNumbers = record['Phone Numbers']?.trim() || record['Phone']?.trim() || '';
        const emails = record['Emails']?.trim() || record['Email']?.trim() || '';
        
        if (phoneNumbers || emails) {
          directoryMap.set(key, {
            phoneNumbers,
            emails
          });
        }
      }

      mergedRecords = [];
      for (const record of rentRollData) {
        if (!record || record.Status !== 'Current') continue;

        const tenant = formatName(record.Tenant || '');
        const property = record.Property?.trim();
        const unit = record.Unit?.trim();
        
        if (!tenant || !property || !unit) continue;
        if (!record.Rent || safeFloat(record.Rent) === 0) continue;

        const key = `${property}-${unit}-${cleanName(tenant)}`;

        const delinquencyRecord = delinquencyMap.get(key);
        const directoryRecord = directoryMap.get(key);

        const tenureMonths = calculateTenureMonths(record['Move-in']);
        const latePaymentRate = tenureMonths > 0 ? 
          (safeFloat(record['Late Count']) || 0) / tenureMonths : 0;

        const baseRecord = {
          property,
          unit,
          tenant,
          rentAmount: safeFloat(record.Rent),
          marketRent: safeFloat(record['Market Rent']),
          pastDue: safeFloat(record['Past Due']),
          leaseEndDate: record['Lease To'] || '',
          moveInDate: record['Move-in'] || '',
          lateCount: safeFloat(record['Late Count']),
          tenureMonths,
          latePaymentRate,
          phoneNumbers: directoryRecord?.phoneNumbers || '',
          emails: directoryRecord?.emails || '',
          ...(delinquencyRecord || {
            amountReceivable: 0,
            delinquentRent: 0,
            delinquencyNotes: '',
            aging30: 0,
            aging60: 0,
            aging90: 0,
            agingOver90: 0,
            delinquentSubsidyAmount: 0
          })
        };

        const filteredRecord = filterEmptyValues(baseRecord);
        mergedRecords.push(filteredRecord);
      }
    }

    console.log('Processed Records Summary:', {
      totalRecords: mergedRecords.length,
      recordsWithDelinquentRent: mergedRecords.filter(r => r.delinquentRent > 0).length,
      recordsWithAging30: mergedRecords.filter(r => r.aging30 > 0).length,
      recordsWithAging60: mergedRecords.filter(r => r.aging60 > 0).length,
      recordsWithAging90: mergedRecords.filter(r => r.aging90 > 0).length,
      recordsWithAgingOver90: mergedRecords.filter(r => r.agingOver90 > 0).length
    });

    return new Response(
      JSON.stringify(mergedRecords),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in merge-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process CSV files. Please ensure all files are valid CSV format.'
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});