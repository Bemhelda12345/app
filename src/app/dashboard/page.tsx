"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Sidebar } from '@/components/Sidebar';

interface FirebaseDevice {
  key: string;
  Name: string;
  Address: string;
  OUTAGE: string;
  kwhr?: number;
  kwh?: number;
  tampering: boolean | string;
  status: string;
  "Contact Number": string;
  Email: string;
}

const StatusBadge = ({ status }: { status?: string }) => {
  const cleanStatus = (status || '').replace(':', '').toLowerCase();
  const displayText = status || 'Unknown';
  const isActivated = cleanStatus.includes('activated');
  const isDeactivated = cleanStatus.includes('deactivated');
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${
        isActivated ? 'bg-sems-primary text-white' : isDeactivated ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
      }`}
    >
      {displayText.toUpperCase()}
    </span>
  );
};

const TamperingBadge = ({ tampering }: { tampering: boolean | string }) => {
  const tampered = String(tampering).toLowerCase().startsWith('true');
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${tampered ? 'bg-red-600 text-white' : 'bg-sems-primary text-white'}`}>
      {tampered ? 'Tampering Detected' : 'Normal'}
    </span>
  );
};

const OutageBadge = ({ outage }: { outage?: string | boolean }) => {
  // Normalize outage string to handle "true:" or "false:" with colon
  const outageStr = typeof outage === "string" ? outage.replace(":", "").toLowerCase() : outage;
  const isOutage = outageStr === true || outageStr === "true";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${isOutage ? 'bg-red-600 text-white' : 'bg-sems-primary text-white'}`}>
      {isOutage ? 'Outage Detected' : 'Normal'}
    </span>
  );
};

export default function DashboardPage() {
  const [meterData, setMeterData] = useState<FirebaseDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const devicesRef = ref(database, 'devices');

    const unsubscribe = onValue(
      devicesRef,
      (snapshot) => {
        try {
          if (snapshot.exists()) {
            const data = snapshot.val();
            console.log("Fetched devices data:", data);
              const dataArray = Object.keys(data).map((key) => {
                const device = data[key];
                console.log(`Device ${key} status raw:`, device.status || device.Status);
                const statusRaw = device.status || device.Status || "";
                const statusNormalized = String(statusRaw).toLowerCase().replace(/:$/, "").trim();
                let statusMapped = "Unknown";
                if (statusNormalized === "activated") statusMapped = "Activated";
                else if (statusNormalized === "deactivated") statusMapped = "Deactivated";
                return {
                  key: key,
                  ...device,
                  status: statusMapped,
                  tampering: device.tampering ? String(device.tampering) : "",
                  OUTAGE: device.OUTAGE ? String(device.OUTAGE) : "",
                };
              });

            setMeterData(dataArray);
            setError(null);
          } else {
            setError('No devices found in the database.');
            setMeterData([]);
          }
        } catch (err: any) {
          setError(err.message);
          console.error('Error processing meter data:', err);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setError(error.message);
        console.error('Error fetching meter data:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredData = useMemo(() => {
    return meterData.filter((device) => {
      const matchesSearch =
        (device.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (device.Address?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (device['Contact Number']?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const matchesStatus = (() => {
        if (statusFilter === 'All') return true;
        
        if (statusFilter === 'Activated') {
          return device.status === 'Activated';
        }
        
        if (statusFilter === 'Deactivated') {
          return device.status === 'Deactivated';
        }
        
        if (statusFilter === 'Tampered Meter') {
          return String(device.tampering).toLowerCase().startsWith('true');
        }
        
        if (statusFilter === 'Outage Detected') {
          const outageStr = typeof device.OUTAGE === 'string' ? device.OUTAGE.replace(':', '').toLowerCase() : String(device.OUTAGE);
          return outageStr === 'true';
        }
        
        return false;
      })();

      return matchesSearch && matchesStatus;
    });
  }, [meterData, searchTerm, statusFilter]);

  // New computations for summary boxes
  const totalTampered = useMemo(() => {
    return meterData.filter(device => String(device.tampering).toLowerCase().startsWith('true')).length;
  }, [meterData]);

  const totalOutages = useMemo(() => {
    return meterData.filter(device => {
      const outageStr = typeof device.OUTAGE === 'string' ? device.OUTAGE.replace(':', '').toLowerCase() : String(device.OUTAGE);
      return outageStr === 'true';
    }).length;
  }, [meterData]);

  const mostOutageLocation = useMemo(() => {
    const outageDevices = meterData.filter(device => {
      const outageStr = typeof device.OUTAGE === 'string' ? device.OUTAGE.replace(':', '').toLowerCase() : String(device.OUTAGE);
      return outageStr === 'true';
    });
    const locationCount: Record<string, number> = {};
    outageDevices.forEach(device => {
      const loc = device.Address || 'Unknown';
      locationCount[loc] = (locationCount[loc] || 0) + 1;
    });
    let maxCount = 0;
    let maxLocation = 'N/A';
    for (const loc in locationCount) {
      if (locationCount[loc] > maxCount) {
        maxCount = locationCount[loc];
        maxLocation = loc;
      }
    }
    return maxLocation;
  }, [meterData]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-sems-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-2 text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full" suppressHydrationWarning>
      <Sidebar />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <input
            type="text"
            placeholder="Search by meter number or location"
            className="w-full max-w-md rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sems-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="w-full max-w-xs rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sems-accent"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Activated">Activated</option>
            <option value="Deactivated">Deactivated</option>
            <option value="Tampered Meter">Tampered Meter</option>
            <option value="Outage Detected">Outage Detected</option>
          </select>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-sems-primary">Reports - Meter Monitoring</CardTitle>
            <CardDescription>Showing {filteredData.length} of {meterData.length} records</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-center py-10 text-red-600">
                <p className="font-semibold">Error: {error}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meter Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reading</TableHead>
                    <TableHead>Tampering</TableHead>
                    <TableHead>Power Outage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((device) => {
                    const power = device.kwhr ?? device.kwh ?? 0;
                    return (
                      <tr key={device.key}>
                        <td className="font-mono text-left text-sm px-4">{device['Contact Number']}</td>
                        <td className="text-left text-sm px-4">{device.Address}</td>
                        <td className="text-left text-sm px-4">
                          {new Date().toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                          })}
                          <br />
                          {new Date().toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="text-left px-4">
                          <span className="rounded bg-sems-accent px-2 py-0.5 text-xs font-semibold text-gray-900">
                            {power} kWh
                          </span>
                        </td>
                        <td className="text-left px-4">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${String(device.tampering).toLowerCase().startsWith('true') ? 'bg-red-600 text-white' : 'bg-sems-primary text-white'}`}>
                            {String(device.tampering).toLowerCase().startsWith('true') ? 'Tampering Detected' : 'Normal'}
                          </span>
                        </td>
                        <td className="text-left px-4">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${device.OUTAGE === 'true:' ? 'bg-red-600 text-white' : 'bg-sems-primary text-white'}`}>
                            {device.OUTAGE === 'true:' ? 'Outage Detected' : 'Normal'}
                          </span>
                        </td>
                        <td className="text-left px-4">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${device.status === 'Activated' ? 'bg-sems-primary text-white' : 'bg-red-600 text-white'}`}>
                            {device.status?.toUpperCase() ?? 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="text-right align-middle">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Button asChild variant="outline" size="sm" className="border-sems-primary text-sems-primary hover:bg-sems-primary hover:text-white h-8 flex items-center">
                              <Link href={`/alerts/${encodeURIComponent(device.key)}`}>Alert</Link>
                            </Button>
                            <Button asChild size="sm" className="bg-sems-primary hover:bg-sems-primary/90 text-white h-8 flex items-center">
                              <Link href={`/billing/${encodeURIComponent(device.key)}`}>Billing</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
