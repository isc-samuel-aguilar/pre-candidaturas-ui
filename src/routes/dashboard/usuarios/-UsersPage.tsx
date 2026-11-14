import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material'
import { revealCredential } from '../../../services/credentialService'
import {
  administrativeRoles, createUser, deleteUser, listUsers, updateUser,
  type ManagedUser, type UserFields,
} from '../../../services/userService'

const emptyFields: UserFields = {
  username: '', password: '', name: '', lastName: '', motherLastName: '',
  email: '', phone: '', roleName: 'VALIDATOR',
}

const fields = [
  { name: 'username', label: 'Usuario', required: true },
  { name: 'password', label: 'Contraseña', type: 'password', required: true },
  { name: 'email', label: 'Correo electrónico', type: 'email', required: true },
  { name: 'lastName', label: 'Apellido paterno', required: true },
  { name: 'motherLastName', label: 'Apellido materno' },
  { name: 'name', label: 'Nombre(s)', required: true },
  { name: 'phone', label: 'Teléfono', type: 'tel', required: true },
  { name: 'roleName', label: 'Rol', required: true },
] as const satisfies ReadonlyArray<{
  name: keyof UserFields
  label: string
  type?: string
  required?: boolean
}>

type Field = (typeof fields)[number]

function UserField({ field, values, onChange, editing, currentRole, disabled }: {
  field: Field
  values: UserFields
  onChange: (values: UserFields) => void
  editing?: boolean
  currentRole?: string
  disabled: boolean
}) {
  const roles = currentRole === 'REGISTER'
    ? ['REGISTER', ...administrativeRoles]
    : administrativeRoles

  return (
    <TextField
      label={field.label}
      value={values[field.name]}
      onChange={(event) => onChange({ ...values, [field.name]: event.target.value })}
      disabled={disabled}
      select={field.name === 'roleName'}
      required={'required' in field && (!editing || field.name !== 'password')}
      type={'type' in field ? field.type : undefined}
      autoComplete={field.name === 'password' ? 'new-password' : undefined}
      size="small"
      fullWidth
    >
      {field.name === 'roleName' && roles.map((role) => (
        <MenuItem key={role} value={role}>{role}</MenuItem>
      ))}
    </TextField>
  )
}

function errorMessage(error: unknown, fallback: string): string {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : fallback
}

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [creation, setCreation] = useState(emptyFields)
  const [editing, setEditing] = useState<{ user: ManagedUser; values: UserFields }>()
  const [deleting, setDeleting] = useState<ManagedUser>()
  const [revealing, setRevealing] = useState<ManagedUser>()
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listUsers()
      .then((result) => { if (active) setUsers(result) })
      .catch((cause: unknown) => { if (active) setError(errorMessage(cause, 'No se pudo cargar la lista de usuarios.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function mutate(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
      setUsers(await listUsers())
    } catch (cause) {
      setError(errorMessage(cause, 'No se pudo completar la operación.'))
    } finally {
      setBusy(false)
    }
  }

  function beginEditing(user: ManagedUser) {
    setEditing({
      user,
      values: {
        username: user.username, password: '', name: user.name ?? '', lastName: user.lastName ?? '',
        motherLastName: user.motherLastName ?? '', email: user.email ?? '', phone: user.phone ?? '',
        roleName: user.role.name,
      },
    })
  }

  function submitCreation(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (!creation.password.trim()) {
      setError('La contraseña es requerida.')
      return
    }
    void mutate(async () => {
      await createUser(creation)
      setCreation(emptyFields)
    })
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault()
    if (busy || !editing) return
    void mutate(async () => {
      await updateUser(editing.user, editing.values)
      setEditing(undefined)
    })
  }

  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h5">Usuarios</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper component="form" onSubmit={submitCreation} sx={{ p: 2 }}>
        <Typography component="h2" variant="h6" gutterBottom>Crear usuario</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
          {fields.map((field) => (
            <UserField key={field.name} field={field} values={creation} onChange={setCreation} disabled={busy} />
          ))}
        </Box>
        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={busy}>Crear usuario</Button>
      </Paper>

      <Box component="form" onSubmit={submitEdit}>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="Usuarios existentes">
            <TableHead>
              <TableRow>
                {fields.map((field) => <TableCell key={field.name}>{field.label}</TableCell>)}
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  {fields.map((field) => (
                    <TableCell key={field.name} sx={{ minWidth: editing?.user.id === user.id ? 145 : undefined }}>
                      {editing?.user.id === user.id ? (
                        <UserField field={field} values={editing.values} onChange={(values) => setEditing({ user, values })} editing currentRole={user.role.name} disabled={busy} />
                      ) : field.name === 'password' ? (
                        <Button type="button" onClick={() => setRevealing(user)} disabled={busy || !!editing || !user.enabled}>Obtener</Button>
                      ) : field.name === 'roleName' ? user.role.name : user[field.name]}
                    </TableCell>
                  ))}
                  <TableCell>{user.enabled ? 'Activo' : 'Inactivo'}</TableCell>
                  <TableCell>
                    <Stack direction="row">
                      {editing?.user.id === user.id ? (
                        <>
                          <Button type="submit" disabled={busy}>Guardar</Button>
                          <Button type="button" disabled={busy} onClick={() => setEditing(undefined)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          <Button type="button" disabled={busy || !!editing || !user.enabled} onClick={(event) => {
                            event.preventDefault()
                            beginEditing(user)
                          }}>Editar</Button>
                          <Button type="button" disabled={busy || !!editing || !user.enabled} color="error" onClick={() => setDeleting(user)}>Eliminar</Button>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={fields.length + 2}>{loading ? 'Cargando usuarios…' : 'Sin usuarios para mostrar.'}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={!!deleting} onClose={() => setDeleting(undefined)}>
        <DialogTitle>Eliminar usuario</DialogTitle>
        <DialogContent>Se desactivará la cuenta {deleting?.username}.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(undefined)}>Cancelar</Button>
          <Button color="error" disabled={busy} onClick={() => {
            if (!deleting) return
            void mutate(async () => {
              await deleteUser(deleting.id)
              setDeleting(undefined)
            })
          }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
      {revealing && <RevealDialog user={revealing} onClose={() => setRevealing(undefined)} />}
    </Stack>
  )
}

function RevealDialog({ user, onClose }: { user: ManagedUser; onClose: () => void }) {
  const [secret, setSecret] = useState('')
  const [password, setPassword] = useState<string>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (busy || !secret.trim()) return
    setBusy(true)
    setError('')
    try {
      setPassword(await revealCredential(user.id, secret))
    } catch (cause) {
      const status = typeof cause === 'object' && cause !== null && 'status' in cause ? cause.status : undefined
      if (status === 403) setError('Contraseña de recuperación incorrecta o acceso denegado.')
      else if (status === 404) setError('La credencial no está disponible.')
      else if (status === 429) setError('Demasiados intentos de consulta. Inténtalo más tarde.')
      else setError(errorMessage(cause, 'No se pudo obtener la contraseña.'))
    } finally {
      setSecret('')
      setBusy(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Obtener contraseña de {user.username}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {password === undefined ? (
            <TextField
              autoFocus
              autoComplete="off"
              label="Contraseña de recuperación"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required
              disabled={busy}
              fullWidth
              margin="dense"
            />
          ) : (
            <TextField label="Contraseña del usuario" value={password} fullWidth margin="dense" slotProps={{ input: { readOnly: true } }} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
          {password === undefined && <Button type="submit" disabled={busy || !secret.trim()}>Obtener</Button>}
        </DialogActions>
      </Box>
    </Dialog>
  )
}
