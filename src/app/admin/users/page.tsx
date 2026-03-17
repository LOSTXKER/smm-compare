"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, KeyRound, Shield, Eye } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchUsers = () => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">
            เพิ่ม ลบ หรือแก้ไขบัญชีผู้ใช้งาน
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <UserPlus className="mr-2 h-4 w-4" />
            เพิ่มผู้ใช้
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
            </DialogHeader>
            <AddUserForm
              onSuccess={() => {
                setDialogOpen(false);
                fetchUsers();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ผู้ใช้ทั้งหมด ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ยังไม่มีผู้ใช้
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead className="text-center">สิทธิ์</TableHead>
                  <TableHead className="text-center">สถานะ</TableHead>
                  <TableHead>สร้างเมื่อ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <UserRow key={user.id} user={user} onUpdate={fetchUsers} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30">
        <Shield className="mr-1 h-3 w-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">
      <Eye className="mr-1 h-3 w-3" />
      Viewer
    </Badge>
  );
}

function UserRow({ user, onUpdate }: { user: User; onUpdate: () => void }) {
  const [changingPw, setChangingPw] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const handleToggleRole = async () => {
    const newRole = user.role === "admin" ? "viewer" : "admin";
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role: newRole }),
      });
      toast.success(`เปลี่ยนสิทธิ์เป็น ${newRole} แล้ว`);
      onUpdate();
    } catch {
      toast.error("เปลี่ยนสิทธิ์ล้มเหลว");
    }
  };

  const handleToggleActive = async () => {
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      });
      toast.success(user.active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว");
      onUpdate();
    } catch {
      toast.error("อัพเดทล้มเหลว");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`ลบผู้ใช้ ${user.name} (${user.email})?`)) return;
    try {
      const res = await fetch(`/api/users?id=${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("ลบผู้ใช้แล้ว");
        onUpdate();
      }
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, password: newPassword }),
      });
      toast.success("เปลี่ยนรหัสผ่านแล้ว");
      setChangingPw(false);
      setNewPassword("");
    } catch {
      toast.error("เปลี่ยนรหัสผ่านล้มเหลว");
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{user.name}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
        <TableCell className="text-center">
          <RoleBadge role={user.role} />
        </TableCell>
        <TableCell className="text-center">
          <Badge
            variant="outline"
            className={
              user.active
                ? "border-green-500 text-green-500"
                : "border-red-500 text-red-500"
            }
          >
            {user.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
          </Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString("th-TH")}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleRole}
            >
              {user.role === "admin" ? "เป็น Viewer" : "เป็น Admin"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangingPw(!changingPw)}
            >
              <KeyRound className="mr-1 h-3 w-3" />
              รหัสผ่าน
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleActive}
            >
              {user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              ลบ
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {changingPw && (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="flex items-center gap-2 py-1">
              <Input
                type="password"
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="max-w-xs"
              />
              <Button size="sm" onClick={handleChangePassword}>
                บันทึก
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setChangingPw(false);
                  setNewPassword("");
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("viewer");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`เพิ่มผู้ใช้ ${name} สำเร็จ`);
        onSuccess();
      }
    } catch {
      toast.error("เพิ่มผู้ใช้ล้มเหลว");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">ชื่อ</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อผู้ใช้"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">รหัสผ่าน</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="อย่างน้อย 6 ตัวอักษร"
          required
        />
      </div>
      <div className="space-y-2">
        <Label>สิทธิ์</Label>
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin (จัดการทุกอย่าง)</SelectItem>
            <SelectItem value="viewer">Viewer (ดูอย่างเดียว)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
      </Button>
    </form>
  );
}
