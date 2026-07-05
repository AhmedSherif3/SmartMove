"use client";

import React, { useEffect, useState } from "react";
import AdminTable from "@/components/admin/AdminTable";
import { listUsers, updateUser, deleteUser, type UserListItem } from "@/lib/auth/api";
import { toast } from "react-hot-toast";
import { Trash2, BadgeCheck, BadgeAlert } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchUsersData = async () => {
    try {
      setIsLoading(true);
      const data = await listUsers();
      setUsers(data);
    } catch {
      toast.error("Failed to synchronize user records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersData();
  }, []);

  const handleToggleStatus = async (user: UserListItem) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      toast.success(`${user.email} status updated.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: !u.is_active } : u))
      );
    } catch {
      toast.error("Failed to update user status.");
    }
  };

  const handleChangeRole = async (user: UserListItem, newRole: string) => {
    try {
      await updateUser(user.id, { role: newRole });
      toast.success(`${user.email} role updated to ${newRole}.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
    } catch {
      toast.error("Failed to update user role.");
    }
  };

  const handleDeleteUser = async (user: UserListItem) => {
    if (!confirm(`Are you sure you want to permanently delete user ${user.email}? This action is IRREVERSIBLE.`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      toast.success("User deleted successfully.");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      toast.error("Failed to delete user.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "" || u.role === roleFilter;
    const matchesStatus =
      statusFilter === "" ||
      (statusFilter === "active" ? u.is_active : !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const renderRow = (user: UserListItem) => (
    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {user.first_name} {user.last_name}
          </span>
          <span className="text-xs text-slate-400 font-mono tracking-tight">{user.email}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative inline-block w-full max-w-[140px]">
          <select
            value={user.role}
            onChange={(e) => handleChangeRole(user, e.target.value)}
            className="w-full appearance-none bg-transparent border-none text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 cursor-pointer focus:ring-0"
          >
            <option value="ADMIN">Admin</option>
            <option value="DATA_ANALYST">Analyst</option>
            <option value="USER">User</option>
          </select>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => handleToggleStatus(user)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
            user.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800/50"
              : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800/50"
          }`}
        >
          {user.is_active ? (
            <><BadgeCheck size={12} /> Active</>
          ) : (
            <><BadgeAlert size={12} /> Inactive</>
          )}
        </button>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="text-xs font-mono text-slate-400">
          {user.last_login ? new Date(user.last_login).toLocaleDateString() : "NEVER"}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={() => handleDeleteUser(user)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            title="Delete User"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          User Management
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor neural workspace participants and authorize access protocols.
        </p>
      </div>

      <AdminTable
        headers={["IDENTITY / EMAIL", "PORTAL ROLE", "STATUS", "LAST ACCESS", "ACTIONS"]}
        data={filteredUsers}
        renderRow={renderRow}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        isLoading={isLoading}
        filters={[
          {
            label: "ALL ROLES",
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { label: "ADMIN", value: "ADMIN" },
              { label: "ANALYST", value: "DATA_ANALYST" },
              { label: "USER", value: "USER" },
            ],
          },
          {
            label: "ALL STATUSES",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "ACTIVE", value: "active" },
              { label: "INACTIVE", value: "inactive" },
            ],
          },
        ]}
      />
    </div>
  );
}
