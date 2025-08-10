"use client";

import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { database } from "@/lib/firebase";
import { ref, onValue, set, remove } from "firebase/database";

interface FirebaseUser {
  Address: string;
  "Contact Number": string;
  Email: string;
  Name: string;
  OUTAGE: string;
  Price: number;
  Serial: string;
  payment?: boolean;
  status?: string;
  kwh?: number;
  role?: string;
  tampering?: string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  address: string;
  contactNumber: string;
  serial: string | null;
  paymentStatus: "Paid" | "Pending";
  status: "Activated" | "Deactivated";
  price: number;
  outage: string;
}

const PaymentStatusBadge = ({ status }: { status: User["paymentStatus"] }) => {
  const colors = {
    Paid: "bg-sems-primary text-white",
    Pending: "bg-yellow-600 text-white",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${colors[status]}`}>
      {status}
    </span>
  );
};

const StatusBadge = ({ status }: { status: User["status"] }) => {
  const colors = {
    Activated: "bg-sems-primary text-white",
    Deactivated: "bg-red-600 text-white",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${colors[status]}`}>
      {status}
    </span>
  );
};

export default function ManageUserPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  useEffect(() => {
    const devicesRef = ref(database, 'devices');
    
    const unsubscribe = onValue(devicesRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const usersArray: User[] = Object.keys(data).map(key => {
            const firebaseUser: FirebaseUser = data[key];
            return {
              id: key,
              name: firebaseUser.Name || null,
              email: firebaseUser.Email || null,
              address: firebaseUser.Address || "",
              contactNumber: firebaseUser["Contact Number"] || key,
              serial: firebaseUser.Serial || null,
              // Map payment string to Paid/Pending
              paymentStatus: String(firebaseUser.payment).toLowerCase().replace(":", "").trim() === "true" ? "Paid" : "Pending",
              // Map status string to Activated/Deactivated
              status: firebaseUser.status?.toLowerCase().replace(":", "").trim() === "activated" ? "Activated" : "Deactivated",
              price: firebaseUser.Price || 0,
              outage: firebaseUser.OUTAGE || "",
            };
          });
          setUsers(usersArray);
          setError(null);
        } else {
          setError("No users found in the database.");
          setUsers([]);
        }
      } catch (err: any) {
        setError(err.message);
        console.error("Error processing user data:", err);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      setError(error.message);
      console.error("Error fetching user data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = searchTerm.toLowerCase();
      return (
        (user.name?.toLowerCase().includes(term) ?? false) ||
        (user.email?.toLowerCase().includes(term) ?? false) ||
        user.address.toLowerCase().includes(term) ||
        user.contactNumber.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, users]);

  const createForm = useForm<User>({
    defaultValues: {
      id: "",
      name: "",
      email: "",
      address: "",
      contactNumber: "",
      serial: "",
      paymentStatus: "Paid",
      status: "Activated",
      price: 0,
      outage: "",
    },
  });

  const editForm = useForm<User>();

  const openEditDialog = (user: User) => {
    setEditUser(user);
    // Reset the form with the selected user's data
    editForm.reset({
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      address: user.address,
      contactNumber: user.contactNumber,
      serial: user.serial || "",
      paymentStatus: user.paymentStatus,
      status: user.status,
      price: user.price,
      outage: user.outage,
    });
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setEditUser(null);
    setIsEditOpen(false);
    editForm.reset();
  };

  const onCreateSubmit = async (data: User) => {
    try {
      const deviceRef = ref(database, `devices/${data.contactNumber}`);
      await set(deviceRef, {
        Name: data.name,
        Email: data.email,
        Address: data.address,
        "Contact Number": data.contactNumber,
        Serial: data.serial,
        // Map Paid/Pending to string with colon
        payment: data.paymentStatus === "Paid" ? "true:" : "false:",
        // Map Activated/Deactivated to lowercase with colon
        status: data.status.toLowerCase() + ":",
        Price: data.price,
        OUTAGE: data.outage,
        kwh: 0,
        role: "User",
        tampering: "false:",
      });
      setIsCreateOpen(false);
      createForm.reset();
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const onEditSubmit = async (data: User) => {
    try {
      if (!editUser) return;
      
      const deviceRef = ref(database, `devices/${editUser.id}`);
      await set(deviceRef, {
        Name: data.name,
        Email: data.email,
        Address: data.address,
        "Contact Number": data.contactNumber,
        Serial: data.serial,
        // Map Paid/Pending to string with colon
        payment: data.paymentStatus === "Paid" ? "true:" : "false:",
        // Map Activated/Deactivated to lowercase with colon
        status: data.status.toLowerCase() + ":",
        Price: data.price,
        OUTAGE: data.outage,
        kwh: 0,
        role: "User",
        tampering: "false:",
      });
      closeEditDialog();
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const onDelete = async (id: string) => {
    try {
      const deviceRef = ref(database, `devices/${id}`);
      await remove(deviceRef);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center">
          <div className="inline-block w-8 h-8 border-4 border-sems-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-2 text-gray-700">Loading users...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold font-headline text-sems-primary">Manage User</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-sems-primary hover:bg-sems-primary/90 text-white">
                + Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new user.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={createForm.handleSubmit(onCreateSubmit)}
                className="flex flex-col gap-4"
              >
                <Input
                  {...createForm.register("name")}
                  placeholder="Name"
                  required
                />
                <Input
                  {...createForm.register("email")}
                  placeholder="Email"
                  type="email"
                  required
                />
                <Input
                  {...createForm.register("address")}
                  placeholder="Address"
                  required
                />
                <Input
                  {...createForm.register("contactNumber")}
                  placeholder="Contact Number"
                  required
                />
                <Input
                  {...createForm.register("serial")}
                  placeholder="Serial"
                />
                <select
                  {...createForm.register("paymentStatus")}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sems-accent"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                </select>
                <Input
                  {...createForm.register("price", { valueAsNumber: true })}
                  placeholder="Price"
                  type="number"
                  required
                />
                <Input
                  {...createForm.register("outage")}
                  placeholder="Outage Status"
                />
                <select
                  {...createForm.register("status")}
                  className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sems-accent"
                >
                  <option value="Activated">Activated</option>
                  <option value="Deactivated">Deactivated</option>
                </select>
                <DialogFooter>
                  <Button type="submit" className="bg-sems-primary hover:bg-sems-primary/90 text-white">
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Input
          type="text"
          placeholder="Search by name, email, address, or meter number"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-sems-primary">Users</CardTitle>
            <CardDescription>
              Showing {filteredUsers.length} of {users.length} users
            </CardDescription>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name ?? "N/A"}</TableCell>
                    <TableCell>{user.email ?? "N/A"}</TableCell>
                    <TableCell>{user.address}</TableCell>
                    <TableCell>{user.contactNumber}</TableCell>
                    <TableCell>{user.serial ?? "N/A"}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={user.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Dialog open={isEditOpen && editUser?.id === user.id} onOpenChange={(open) => {
                        if (!open) closeEditDialog();
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label="Edit user"
                            onClick={() => openEditDialog(user)}
                            className="border-sems-primary text-sems-primary hover:bg-sems-primary hover:text-white"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                              Update the user details below. You can edit fields like Name and Serial that show "N/A".
                            </DialogDescription>
                          </DialogHeader>
                          <form
                            onSubmit={editForm.handleSubmit(onEditSubmit)}
                            className="flex flex-col gap-4"
                          >
                            <Input
                              {...editForm.register("name")}
                              placeholder="Name (currently N/A if empty)"
                            />
                            <Input
                              {...editForm.register("email")}
                              placeholder="Email"
                              type="email"
                            />
                            <Input
                              {...editForm.register("address")}
                              placeholder="Address"
                              required
                            />
                            <Input
                              {...editForm.register("contactNumber")}
                              placeholder="Contact Number"
                              required
                              disabled
                            />
                            <Input
                              {...editForm.register("serial")}
                              placeholder="Serial (currently N/A if empty)"
                            />
                            <select
                              {...editForm.register("paymentStatus")}
                              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sems-accent"
                            >
                              <option value="Paid">Paid</option>
                              <option value="Pending">Pending</option>
                            </select>
                            <Input
                              {...editForm.register("price", { valueAsNumber: true })}
                              placeholder="Price"
                              type="number"
                              required
                            />
                            <Input
                              {...editForm.register("outage")}
                              placeholder="Outage Status"
                            />
                            <select
                              {...editForm.register("status")}
                              className="rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sems-accent"
                            >
                              <option value="Activated">Activated</option>
                              <option value="Deactivated">Deactivated</option>
                            </select>
                            <DialogFooter>
                              <Button
                                type="submit"
                                className="bg-sems-primary hover:bg-sems-primary/90 text-white"
                              >
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label="Delete user"
                        onClick={() => onDelete(user.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
