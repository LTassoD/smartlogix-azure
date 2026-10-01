import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  Eye,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UserPlus,
  UserRound,
  UserX
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataPagination } from "@/components/ui/data-pagination";
import { FormMessage } from "@/components/ui/FormMessage";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SystemServiceAlert } from "@/components/system/SystemServiceAlert";
import { TextInput } from "@/components/ui/TextInput";
import { useToast } from "@/components/ui/toastContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authApi } from "@/features/auth/api/authApi";
import { TwoFactorSettingsCard } from "@/features/auth/components/TwoFactorSettingsCard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Permission } from "@/features/auth/permissions/permissions";
import { usePermissions } from "@/features/auth/permissions/usePermissions";
import type { AuthRole, AuthUser } from "@/features/auth/types/authTypes";
import { usersApi, type CreateUserInput } from "@/features/settings/api/usersApi";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { useClientPagination } from "@/hooks/useClientPagination";
import { getSafeErrorMessage } from "@/lib/api/apiErrors";
import type { UserResponse } from "@/lib/api/apiTypes";
import {
  getServiceMessage,
  getServiceStatusLabel,
  getStatusTone,
  getSystemStatusLabel,
  isServiceOperational
} from "@/lib/system/systemHealth";
import { applyUiPreferences, getUiPreferences, saveUiPreferences, type UiPreferences } from "@/lib/ui/uiPreferences";
import { cn } from "@/utils/cn";

type SettingsTab = "account" | "users" | "permissions" | "preferences" | "system";

type PermissionGroup = {
  title: string;
  permissions: Permission[];
};

const baseTabs: Array<{ id: SettingsTab; label: string; icon: typeof UserRound; adminOnly?: boolean }> = [
  { id: "account", label: "Mi cuenta", icon: UserRound },
  { id: "users", label: "Usuarios", icon: UserPlus, adminOnly: true },
  { id: "permissions", label: "Permisos", icon: ShieldCheck },
  { id: "preferences", label: "Preferencias", icon: SlidersHorizontal },
  { id: "system", label: "Sistema", icon: CheckCircle2 }
];

const roleOptions: AuthRole[] = ["ADMIN", "OPERATOR", "VIEWER"];

const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short"
});

export function SettingsPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const toast = useToast();
  const status = useBackendStatus();
  const isAdmin = permissions.role === "ADMIN";
  const tabs = useMemo(() => baseTabs.filter((tab) => !tab.adminOnly || isAdmin), [isAdmin]);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [account, setAccount] = useState<AuthUser | null>(user);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [storedPreferences, setStoredPreferences] = useState<UiPreferences>(() => getUiPreferences());
  const [preferences, setPreferences] = useState<UiPreferences>(() => getUiPreferences());
  const [preferencesSavedAt, setPreferencesSavedAt] = useState<Date | null>(null);
  const [statusCheckedAt, setStatusCheckedAt] = useState<Date | null>(null);
  const permissionGroups = useMemo(() => groupPermissions(permissions.permissions), [permissions.permissions]);

  useEffect(() => {
    if (user) {
      setAccount(user);
    }
  }, [user]);

  useEffect(() => {
    if (!status.loading) {
      setStatusCheckedAt(new Date());
    }
  }, [status.loading]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("account");
    }
  }, [activeTab, tabs]);

  async function refreshAccount() {
    setAccountLoading(true);
    setAccountError(null);

    try {
      const nextUser = await authApi.getCurrentUser();
      setAccount(nextUser);
      toast.success("Datos de cuenta actualizados.");
    } catch (error) {
      setAccountError(getSafeErrorMessage(error));
    } finally {
      setAccountLoading(false);
    }
  }

  function handleChangePreferences(nextPreferences: UiPreferences) {
    setPreferences(nextPreferences);
    applyUiPreferences(nextPreferences);
  }

  function handleSavePreferences() {
    const changed =
      preferences.tableDensity !== storedPreferences.tableDensity ||
      preferences.defaultPageSize !== storedPreferences.defaultPageSize;
    const savedPreferences = saveUiPreferences(preferences);
    setPreferences(savedPreferences);
    setStoredPreferences(savedPreferences);

    if (changed) {
      setPreferencesSavedAt(new Date());
      toast.success("Preferencias aplicadas correctamente.");
    }
  }

  const handleTwoFactorStatusChange = useCallback((enabled: boolean) => {
    setAccount((current) => (current ? { ...current, twoFactorEnabled: enabled } : current));
  }, []);

  return (
    <div className="space-y-6">
      <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Administracion</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Configuracion</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Administra tu cuenta, usuarios, preferencias y estado operativo del sistema.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <StatusBadge label={getRoleLabel(account?.role ?? permissions.role)} tone="success" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <nav className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-3 shadow-panel">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20",
                  activeTab === tab.id ? "bg-brand-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <tab.icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "account" ? (
          <AccountSection
            account={account}
            error={accountError}
            loading={accountLoading}
            onRefresh={() => void refreshAccount()}
            onTwoFactorStatusChange={handleTwoFactorStatusChange}
          />
        ) : null}
        {activeTab === "users" && isAdmin ? <UsersSection currentUser={account ?? user} /> : null}
        {activeTab === "permissions" ? <PermissionsSection groups={permissionGroups} role={account?.role ?? permissions.role} /> : null}
        {activeTab === "preferences" ? (
          <PreferencesSection
            preferences={preferences}
            savedAt={preferencesSavedAt}
            onChange={handleChangePreferences}
            onSave={handleSavePreferences}
          />
        ) : null}
        {activeTab === "system" ? (
          <SystemSection
            checkedAt={statusCheckedAt}
            error={status.error}
            health={status.health}
            loading={status.loading}
            onRefresh={() => void status.refresh()}
          />
        ) : null}
      </div>
    </div>
  );
}

function AccountSection({
  account,
  error,
  loading,
  onRefresh,
  onTwoFactorStatusChange
}: {
  account: AuthUser | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  onTwoFactorStatusChange: (enabled: boolean) => void;
}) {
  return (
    <SettingsCard
      title="Mi cuenta"
      description="Informacion principal asociada a tu acceso."
      action={
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? <Spinner size="sm" label="Actualizando cuenta" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Actualizar
        </Button>
      }
    >
      {error ? (
        <FormMessage tone="error" title="No fue posible actualizar la cuenta">
          Intenta nuevamente en unos momentos.
        </FormMessage>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ReadonlyField label="Nombre" value={account?.fullName ?? "No informado"} />
        <ReadonlyField label="Email" value={account?.email ?? "No informado"} />
        <ReadonlyField label="Rol" value={getRoleLabel(account?.role)} />
        <ReadonlyField label="Estado" value={account?.active === false ? "Cuenta inactiva" : "Sesion activa"} />
      </div>

      <TwoFactorSettingsCard initialEnabled={account?.twoFactorEnabled} onStatusChange={onTwoFactorStatusChange} />

      <ChangePasswordForm />
    </SettingsCard>
  );
}

function ChangePasswordForm() {
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = validatePasswordChange(values);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    try {
      await usersApi.changeOwnPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Contrasena actualizada correctamente.");
    } catch (submitError) {
      setError(getSafeErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={(event) => void handleSubmit(event)}>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-slate-950">Cambiar mi contrasena</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Usa una contrasena segura para proteger tu cuenta.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <TextInput
          label="Contrasena actual"
          type="password"
          value={values.currentPassword}
          onChange={(event) => setValues((current) => ({ ...current, currentPassword: event.target.value }))}
          required
        />
        <TextInput
          label="Nueva contrasena"
          type="password"
          value={values.newPassword}
          onChange={(event) => setValues((current) => ({ ...current, newPassword: event.target.value }))}
          required
        />
        <TextInput
          label="Confirmar nueva"
          type="password"
          value={values.confirmPassword}
          onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
          required
        />
      </div>

      {error ? (
        <FormMessage tone="error" className="mt-4">
          {error}
        </FormMessage>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner size="sm" label="Guardando contrasena" className="text-current" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Guardando..." : "Guardar contrasena"}
        </Button>
      </div>
    </form>
  );
}

function UsersSection({ currentUser }: { currentUser: AuthUser | null }) {
  const toast = useToast();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AuthRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [detailUser, setDetailUser] = useState<UserResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<UserResponse | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserResponse | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserResponse | null>(null);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = search.trim().toLocaleLowerCase("es-CL");
        const matchesSearch =
          !query ||
          user.fullName.toLocaleLowerCase("es-CL").includes(query) ||
          user.email.toLocaleLowerCase("es-CL").includes(query);
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const active = user.active !== false;
        const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? active : !active);

        return matchesSearch && matchesRole && matchesStatus;
      }),
    [roleFilter, search, statusFilter, users]
  );
  const { paginatedItems, pagination, resetPage } = useClientPagination(filteredUsers);

  useEffect(() => {
    void loadUsers(true);
  }, []);

  useEffect(() => {
    resetPage();
  }, [resetPage, roleFilter, search, statusFilter]);

  async function loadUsers(initial = false) {
    if (initial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);
    try {
      setUsers(await usersApi.listUsers());
    } catch (loadError) {
      setError(getSafeErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleCreate(input: CreateUserInput) {
    setSaving(true);
    try {
      const createdUser = await usersApi.createUser(input);
      setUsers((current) => [...current, createdUser]);
      setCreateOpen(false);
      toast.success("Usuario creado correctamente.");
    } catch (createError) {
      toast.error(getSafeErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(user: UserResponse, role: AuthRole) {
    setSaving(true);
    try {
      const updatedUser = await usersApi.updateRole(user.id, role);
      updateUserInList(updatedUser);
      setRoleUser(null);
      toast.success("Rol actualizado correctamente.");
    } catch (roleError) {
      toast.error(getSafeErrorMessage(roleError));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(user: UserResponse, password: string) {
    setSaving(true);
    try {
      const updatedUser = await usersApi.resetPassword(user.id, password);
      updateUserInList(updatedUser);
      setPasswordUser(null);
      toast.success("Contrasena restablecida correctamente.");
    } catch (passwordError) {
      toast.error(getSafeErrorMessage(passwordError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateUser) {
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await usersApi.deactivateUser(deactivateUser.id);
      updateUserInList(updatedUser);
      setDeactivateUser(null);
      toast.success("Usuario desactivado correctamente.");
    } catch (deactivateError) {
      toast.error(getSafeErrorMessage(deactivateError));
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(user: UserResponse) {
    setSaving(true);
    try {
      const updatedUser = await usersApi.updateUser(user.id, { active: true });
      updateUserInList(updatedUser);
      toast.success("Usuario activado correctamente.");
    } catch (activateError) {
      toast.error(getSafeErrorMessage(activateError));
    } finally {
      setSaving(false);
    }
  }

  function updateUserInList(updatedUser: UserResponse) {
    setUsers((current) => current.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
    setDetailUser((current) => (current?.id === updatedUser.id ? updatedUser : current));
  }

  return (
    <SettingsCard
      title="Usuarios del sistema"
      description="Administra accesos activos, roles y recuperacion de contrasenas."
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={() => void loadUsers()} disabled={refreshing}>
            {refreshing ? <Spinner size="sm" label="Actualizando usuarios" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Actualizar
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Crear usuario
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <TextInput
          label="Buscar usuario"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          placeholder="Nombre o email"
        />
        <SelectField label="Rol" value={roleFilter} onChange={(value) => setRoleFilter(value as AuthRole | "all")}>
          <option value="all">Todos los roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {getRoleLabel(role)}
            </option>
          ))}
        </SelectField>
        <SelectField label="Estado" value={statusFilter} onChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </SelectField>
      </div>

      {error ? (
        <FormMessage tone="error" title="No fue posible cargar usuarios">
          Intenta nuevamente en unos momentos.
        </FormMessage>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Cargando usuarios...</div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Creacion</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No hay usuarios para mostrar.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((user) => (
                      <tr key={user.id} className="transition-colors duration-150 hover:bg-slate-50/90">
                        <td className="px-4 py-3 font-semibold text-slate-950">{user.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <StatusBadge label={getRoleLabel(user.role)} tone="neutral" />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge label={user.active === false ? "Inactivo" : "Activo"} tone={user.active === false ? "danger" : "success"} />
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(user.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <IconAction label="Ver detalle" onClick={() => setDetailUser(user)} icon={Eye} />
                            <IconAction label="Cambiar rol" onClick={() => setRoleUser(user)} icon={ShieldCheck} />
                            <IconAction label="Resetear contrasena" onClick={() => setPasswordUser(user)} icon={KeyRound} />
                            {user.active === false ? (
                              <IconAction label="Activar usuario" onClick={() => void handleActivate(user)} icon={UserCheck} disabled={saving} />
                            ) : (
                              <IconAction
                                label="Desactivar usuario"
                                onClick={() => setDeactivateUser(user)}
                                icon={UserX}
                                disabled={currentUser?.id === user.id && user.role === "ADMIN"}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filteredUsers.length > 0 ? <DataPagination {...pagination} /> : null}
        </>
      )}

      <CreateUserModal open={createOpen} saving={saving} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
      <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
      <RoleModal user={roleUser} saving={saving} onClose={() => setRoleUser(null)} onSubmit={handleRoleChange} />
      <ResetPasswordModal user={passwordUser} saving={saving} onClose={() => setPasswordUser(null)} onSubmit={handleResetPassword} />
      <ConfirmDialog
        open={Boolean(deactivateUser)}
        title="Desactivar usuario"
        description="La cuenta quedara sin acceso, pero se conservara su historial."
        confirmLabel="Desactivar"
        loading={saving}
        onClose={() => setDeactivateUser(null)}
        onConfirm={() => void handleDeactivate()}
      >
        {deactivateUser ? `${deactivateUser.fullName} quedara desactivado.` : null}
      </ConfirmDialog>
    </SettingsCard>
  );
}

function PermissionsSection({ groups, role }: { groups: PermissionGroup[]; role: AuthRole | null }) {
  return (
    <SettingsCard title="Permisos y rol" description="Resumen claro de las capacidades activas para tu perfil.">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-blue-950">Rol actual</p>
            <p className="mt-1 text-sm text-blue-800">{getRoleDescription(role)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-slate-950">{group.title}</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.permissions.map((permission) => (
                <span
                  key={permission}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-500/15"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {getPermissionLabel(permission)}
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </SettingsCard>
  );
}

function PreferencesSection({
  onChange,
  onSave,
  preferences,
  savedAt
}: {
  preferences: UiPreferences;
  savedAt: Date | null;
  onChange: (preferences: UiPreferences) => void;
  onSave: () => void;
}) {
  return (
    <SettingsCard
      title="Preferencias de interfaz"
      description="Ajustes visuales seguros para trabajar con tablas y listados."
      action={
        <Button type="button" onClick={onSave}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Guardar preferencias
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-950">Densidad de tablas</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">Ajusta el espacio vertical en tablas.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { value: "comfortable", label: "Comoda" },
              { value: "compact", label: "Compacta" }
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...preferences, tableDensity: option.value as UiPreferences["tableDensity"] })}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/20",
                  preferences.tableDensity === option.value
                    ? "border-brand-600 bg-blue-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-950">Filas por pagina</h4>
          <p className="mt-1 text-sm leading-6 text-slate-500">Valor inicial para tablas paginadas.</p>
          <select
            value={preferences.defaultPageSize}
            onChange={(event) => onChange({ ...preferences, defaultPageSize: Number(event.target.value) })}
            className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
          >
            <option value={10}>10 filas</option>
            <option value={20}>20 filas</option>
            <option value={50}>50 filas</option>
          </select>
        </section>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Vista previa</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-950">Tabla operacional</td>
              <td className="px-4 py-3 text-slate-600">Preferencia activa</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-950">Paginacion</td>
              <td className="px-4 py-3 text-slate-600">{preferences.defaultPageSize} filas por pagina</td>
            </tr>
          </tbody>
        </table>
      </div>

      {savedAt ? <FormMessage tone="success">Preferencias guardadas: {dateTimeFormatter.format(savedAt)}.</FormMessage> : null}
    </SettingsCard>
  );
}

function SystemSection({
  checkedAt,
  error,
  health,
  loading,
  onRefresh
}: {
  checkedAt: Date | null;
  error: string | null;
  health: ReturnType<typeof useBackendStatus>["health"];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <SettingsCard
      title="Estado del sistema"
      description="Verificacion de disponibilidad por servicio."
      action={
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? <Spinner size="sm" label="Verificando estado" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          Verificar estado
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ReadonlyField label="Estado general" value={loading ? "Verificando" : getSystemStatusLabel(health?.status)} />
        <ReadonlyField label="Ultima verificacion" value={checkedAt ? dateTimeFormatter.format(checkedAt) : "Pendiente"} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(health?.services ?? []).map((service) => (
          isServiceOperational(service) ? (
            <div key={service.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 break-words text-sm font-semibold text-slate-950">{service.name}</p>
                <StatusBadge label={getServiceStatusLabel(service.status)} tone={getStatusTone(service.status)} />
              </div>
              <p className="mt-2 break-words text-sm leading-6 text-slate-600">{getServiceMessage(service)}</p>
            </div>
          ) : (
            <SystemServiceAlert
              key={service.key}
              className="md:col-span-2"
              serviceName={service.name}
              status={service.status}
              message={getServiceMessage(service)}
              onRetry={onRefresh}
              isRetrying={loading}
            />
          )
        ))}
      </div>

      {error ? (
        <FormMessage tone="error" title="Verificacion no disponible">
          No fue posible verificar el estado del sistema.
        </FormMessage>
      ) : null}
    </SettingsCard>
  );
}

function CreateUserModal({
  onClose,
  onSubmit,
  open,
  saving
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: CreateUserInput) => Promise<void>;
}) {
  const [values, setValues] = useState<CreateUserInput>({ fullName: "", email: "", role: "OPERATOR", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues({ fullName: "", email: "", role: "OPERATOR", password: "" });
      setConfirmPassword("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateNewUser(values, confirmPassword);
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    await onSubmit(values);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear usuario"
      subtitle="Registra un acceso nuevo para SmartLogix."
      closeDisabled={saving}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="create-user-form" disabled={saving}>
            {saving ? <Spinner size="sm" label="Creando usuario" className="text-current" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Creando..." : "Crear usuario"}
          </Button>
        </div>
      }
    >
      <form id="create-user-form" className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <TextInput label="Nombre completo" value={values.fullName} onChange={(event) => setValues({ ...values, fullName: event.target.value })} required />
        <TextInput label="Email" type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required />
        <SelectField label="Rol" value={values.role} onChange={(value) => setValues({ ...values, role: value as AuthRole })}>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {getRoleLabel(role)}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Contrasena inicial" type="password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} required />
          <TextInput label="Confirmar contrasena" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        </div>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      </form>
    </Modal>
  );
}

function UserDetailModal({ onClose, user }: { user: UserResponse | null; onClose: () => void }) {
  return (
    <Modal open={Boolean(user)} onClose={onClose} title="Detalle de usuario" subtitle="Informacion de acceso registrada." size="md">
      {user ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadonlyField label="Nombre" value={user.fullName} />
          <ReadonlyField label="Email" value={user.email} />
          <ReadonlyField label="Rol" value={getRoleLabel(user.role)} />
          <ReadonlyField label="Estado" value={user.active === false ? "Inactivo" : "Activo"} />
          <ReadonlyField label="Creacion" value={formatDateTime(user.createdAt)} />
          <ReadonlyField label="Actualizacion" value={formatDateTime(user.updatedAt)} />
        </div>
      ) : null}
    </Modal>
  );
}

function RoleModal({
  onClose,
  onSubmit,
  saving,
  user
}: {
  user: UserResponse | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (user: UserResponse, role: AuthRole) => Promise<void>;
}) {
  const [role, setRole] = useState<AuthRole>("OPERATOR");

  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title="Cambiar rol"
      subtitle={user ? `Selecciona el nuevo rol para ${user.fullName}.` : undefined}
      closeDisabled={saving}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => (user ? void onSubmit(user, role) : undefined)} disabled={saving || !user}>
            {saving ? <Spinner size="sm" label="Guardando rol" className="text-current" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Guardando..." : "Guardar rol"}
          </Button>
        </div>
      }
    >
      <SelectField label="Rol" value={role} onChange={(value) => setRole(value as AuthRole)}>
        {roleOptions.map((option) => (
          <option key={option} value={option}>
            {getRoleLabel(option)}
          </option>
        ))}
      </SelectField>
    </Modal>
  );
}

function ResetPasswordModal({
  onClose,
  onSubmit,
  saving,
  user
}: {
  user: UserResponse | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (user: UserResponse, password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [user]);

  function handleSubmit() {
    const validation = validatePasswordPair(password, confirmPassword);
    if (validation) {
      setError(validation);
      return;
    }

    if (user) {
      void onSubmit(user, password);
    }
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title="Resetear contrasena"
      subtitle={user ? `Define una nueva contrasena para ${user.fullName}.` : undefined}
      closeDisabled={saving}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !user}>
            {saving ? <Spinner size="sm" label="Guardando contrasena" className="text-current" /> : <KeyRound className="h-4 w-4" aria-hidden="true" />}
            {saving ? "Guardando..." : "Guardar contrasena"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <TextInput label="Nueva contrasena" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <TextInput label="Confirmar contrasena" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      </div>
    </Modal>
  );
}

function SettingsCard({ action, children, description, title }: { action?: ReactNode; children: ReactNode; description: string; title: string }) {
  return (
    <section className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function ReadonlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value
}: {
  children: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm outline-none transition-all duration-150 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
      >
        {children}
      </select>
    </label>
  );
}

function IconAction({
  disabled = false,
  icon: Icon,
  label,
  onClick
}: {
  label: string;
  icon: typeof Eye;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" className="min-h-9 px-3" onClick={onClick} disabled={disabled} aria-label={label}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, Permission[]>();

  permissions.forEach((permission) => {
    const group = getPermissionGroup(permission);
    groups.set(group, [...(groups.get(group) ?? []), permission]);
  });

  return Array.from(groups.entries()).map(([title, groupPermissions]) => ({
    title,
    permissions: groupPermissions
  }));
}

function getPermissionGroup(permission: Permission): string {
  if (permission.startsWith("inventory")) {
    return "Inventario";
  }

  if (permission.startsWith("orders")) {
    return "Pedidos";
  }

  if (permission.startsWith("shipments")) {
    return "Envios";
  }

  if (permission.startsWith("carriers")) {
    return "Transportistas";
  }

  if (permission.startsWith("warehouses")) {
    return "Bodegas";
  }

  if (permission.startsWith("reports")) {
    return "Reportes";
  }

  if (permission.startsWith("settings")) {
    return "Configuracion";
  }

  return "Panel";
}

function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    "dashboard:view": "Ver dashboard",
    "inventory:view": "Ver inventario",
    "inventory:view-detail": "Ver detalle",
    "inventory:create": "Crear productos",
    "inventory:edit": "Editar productos",
    "inventory:adjust-stock": "Ajustar stock",
    "inventory:deactivate": "Desactivar productos",
    "orders:view": "Ver pedidos",
    "orders:view-detail": "Ver detalle",
    "orders:create": "Crear pedidos",
    "orders:validate": "Validar pedidos",
    "orders:update-status": "Cambiar estado",
    "orders:cancel": "Cancelar pedidos",
    "orders:assign-carrier": "Asignar transportista",
    "shipments:view": "Ver envios",
    "shipments:view-detail": "Ver detalle",
    "shipments:update-status": "Cambiar estado",
    "shipments:cancel": "Cancelar envios",
    "shipments:create-incident": "Registrar incidencia",
    "carriers:view": "Ver transportistas",
    "carriers:view-detail": "Ver detalle",
    "carriers:update-availability": "Actualizar disponibilidad",
    "carriers:create": "Crear transportistas",
    "carriers:edit": "Editar transportistas",
    "warehouses:view": "Ver bodegas",
    "warehouses:view-detail": "Ver detalle",
    "warehouses:view-stock": "Ver stock",
    "warehouses:create": "Crear bodegas",
    "warehouses:edit": "Editar bodegas",
    "warehouses:toggle-active": "Activar o desactivar",
    "reports:view": "Ver reportes",
    "reports:export": "Exportar reportes",
    "settings:view": "Ver configuracion"
  };

  return labels[permission];
}

function getRoleLabel(role: AuthRole | string | null | undefined): string {
  if (role === "ADMIN") {
    return "Administrador";
  }

  if (role === "OPERATOR") {
    return "Operador";
  }

  if (role === "VIEWER") {
    return "Visualizador";
  }

  return "No informado";
}

function getRoleDescription(role: AuthRole | null): string {
  if (role === "ADMIN") {
    return "Administrador con acceso completo a las secciones habilitadas.";
  }

  if (role === "OPERATOR") {
    return "Operador con foco en gestion operacional, sin configuracion.";
  }

  if (role === "VIEWER") {
    return "Visualizador con acceso de solo lectura.";
  }

  return "Rol no informado.";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "No informado";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No informado" : dateTimeFormatter.format(date);
}

function validatePasswordChange(values: { currentPassword: string; newPassword: string; confirmPassword: string }): string | null {
  if (!values.currentPassword.trim()) {
    return "Ingresa tu contrasena actual.";
  }

  return validatePasswordPair(values.newPassword, values.confirmPassword);
}

function validateNewUser(values: CreateUserInput, confirmPassword: string): string | null {
  if (!values.fullName.trim()) {
    return "Ingresa el nombre completo.";
  }

  if (!values.email.trim()) {
    return "Ingresa el email.";
  }

  return validatePasswordPair(values.password, confirmPassword);
}

function validatePasswordPair(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return "Las contrasenas no coinciden.";
  }

  if (!isStrongPassword(password)) {
    return "La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero.";
  }

  return null;
}

function isStrongPassword(value: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}
