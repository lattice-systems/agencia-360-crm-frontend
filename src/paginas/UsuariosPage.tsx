import { zodResolver } from '@hookform/resolvers/zod'
import { Ellipsis, Info, Plus, Search, UserCog, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useIsMobile } from '@/hooks/use-mobile'
import { deLaPagina } from '@/lib/paginacion'
import {
  cambiarRol,
  crearUsuario,
  listarRoles,
  listarUsuarios,
  type Rol,
  type RolApi,
  type UsuarioApi,
} from '../api/acceso.ts'
import { ErrorApi } from '../api/cliente.ts'
import { useConsulta, useMensajeDeError } from '../api/useConsulta.ts'
import { CampoContrasena } from '../componentes/CampoContrasena.tsx'
import { ChipEstado } from '../componentes/ChipEstado.tsx'
import { EncabezadoPagina } from '../componentes/EncabezadoPagina.tsx'
import { EstadoVacio } from '../componentes/EstadoVacio.tsx'
import { Paginacion } from '../componentes/Paginacion.tsx'
import { TablaCargando } from '../componentes/TablaCargando.tsx'
import { NOMBRE_ROL } from '../sesion/roles.ts'
import { useSesion } from '../sesion/useSesion.ts'

const POR_PAGINA = 10
const TODOS = 'TODOS'

interface Datos {
  usuarios: UsuarioApi[]
  roles: RolApi[]
}

async function cargar(): Promise<Datos> {
  const [usuarios, roles] = await Promise.all([listarUsuarios(), listarRoles()])
  return { usuarios, roles }
}

const porNombre = (a: UsuarioApi, b: UsuarioApi) => a.nombre.localeCompare(b.nombre)

/** Usuarios y roles del CRM (CRM-0.1): solo el Gerente de marketing. */
export function UsuariosPage() {
  const { sesion } = useSesion()
  const { datos, cargando, error, recargar, actualizar } = useConsulta(cargar)
  const [busqueda, setBusqueda] = useState('')
  const [rol, setRol] = useState<Rol | typeof TODOS>(TODOS)
  const [pagina, setPagina] = useState(1)
  const [creando, setCreando] = useState(false)
  const [cambiandoRol, setCambiandoRol] = useState<UsuarioApi | null>(null)

  const usuarios = useMemo(() => datos?.usuarios ?? [], [datos])
  const roles = datos?.roles ?? []
  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return usuarios.filter(
      (u) =>
        (rol === TODOS || u.rol === rol) &&
        (!texto || u.nombre.toLowerCase().includes(texto) || u.usuario.toLowerCase().includes(texto)),
    )
  }, [usuarios, busqueda, rol])

  function reemplazar(usuario: UsuarioApi) {
    actualizar((actuales) => {
      const lista = actuales?.usuarios ?? []
      const existe = lista.some((u) => u.id === usuario.id)
      return {
        roles: actuales?.roles ?? [],
        usuarios: (existe ? lista.map((u) => (u.id === usuario.id ? usuario : u)) : [...lista, usuario]).sort(
          porNombre,
        ),
      }
    })
  }

  const botonCrear = (
    <Button onClick={() => setCreando(true)} disabled={!datos}>
      <Plus aria-hidden="true" />
      Crear usuario
    </Button>
  )

  return (
    <section className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Usuarios y roles"
        descripcion="Administra el acceso a Agencia360 · CRM."
        accion={botonCrear}
      />

      <Alert variant="informacion" role="note">
        <Info aria-hidden="true" />
        <AlertTitle>Cada persona tiene un rol</AlertTitle>
        <AlertDescription>Los permisos se aplican según el rol asignado.</AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudieron cargar los usuarios</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            {error}
            <Button variant="outline" onClick={recargar}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : cargando ? (
        <TablaCargando />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-[1fr_16rem]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="buscar-usuario">Buscar usuario</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="buscar-usuario"
                  type="search"
                  placeholder="Nombre o usuario"
                  className="pl-9"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value)
                    setPagina(1)
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="filtro-rol">Rol</Label>
              <Select
                value={rol}
                onValueChange={(valor) => {
                  setRol(valor as Rol | typeof TODOS)
                  setPagina(1)
                }}
              >
                <SelectTrigger id="filtro-rol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos los roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.nombre} value={r.nombre}>
                      {NOMBRE_ROL[r.nombre]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <Card>
              <EstadoVacio
                icono={usuarios.length === 0 ? Users : Search}
                titulo={usuarios.length === 0 ? 'Aún no hay usuarios' : 'Ningún usuario coincide'}
                descripcion={
                  usuarios.length === 0
                    ? 'Crea la primera cuenta para empezar.'
                    : 'Prueba con otro nombre, usuario o rol.'
                }
              />
            </Card>
          ) : (
            <>
              <ListaUsuarios
                usuarios={deLaPagina(filtrados, pagina, POR_PAGINA)}
                propio={sesion?.usuario}
                onCambiarRol={setCambiandoRol}
              />
              <Paginacion
                pagina={pagina}
                porPagina={POR_PAGINA}
                total={filtrados.length}
                nombre="usuarios"
                onCambiar={setPagina}
              />
            </>
          )}
        </>
      )}

      <DialogoCrearUsuario
        abierto={creando}
        roles={roles}
        onCerrar={() => setCreando(false)}
        onCreado={(usuario) => {
          reemplazar(usuario)
          setCreando(false)
          toast.success(`Usuario ${usuario.usuario} creado.`)
        }}
      />
      <DialogoCambiarRol
        usuario={cambiandoRol}
        roles={roles}
        onCerrar={() => setCambiandoRol(null)}
        onCambiado={(usuario) => {
          reemplazar(usuario)
          setCambiandoRol(null)
          toast.success(`El rol de ${usuario.usuario} ahora es ${NOMBRE_ROL[usuario.rol]}.`)
        }}
      />
    </section>
  )
}

interface PropsLista {
  usuarios: UsuarioApi[]
  /** Usuario de la sesión: no puede cambiar su propio rol. */
  propio?: string
  onCambiarRol: (usuario: UsuarioApi) => void
}

function ListaUsuarios({ usuarios, propio, onCambiarRol }: PropsLista) {
  const movil = useIsMobile()
  const estado = (u: UsuarioApi) => (
    <ChipEstado tono={u.activo ? 'exito' : 'neutro'}>{u.activo ? 'Activo' : 'Inactivo'}</ChipEstado>
  )
  const acciones = (u: UsuarioApi) => (
    <AccionesUsuario usuario={u} esPropio={u.usuario === propio} onCambiarRol={onCambiarRol} />
  )

  if (!movil) {
    return (
      <Card className="py-0 md:py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona / usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <span className="block font-medium">{u.nombre}</span>
                  <span className="text-xs text-muted-foreground">{u.usuario}</span>
                </TableCell>
                <TableCell>{NOMBRE_ROL[u.rol]}</TableCell>
                <TableCell>{estado(u)}</TableCell>
                <TableCell className="w-12 text-right">{acciones(u)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {usuarios.map((u) => (
        <li key={u.id}>
          <Card className="gap-2 py-4">
            <div className="flex items-start justify-between gap-2 px-4">
              <div>
                <p className="font-semibold">{u.nombre}</p>
                <p className="text-xs text-muted-foreground">{u.usuario}</p>
              </div>
              {acciones(u)}
            </div>
            <div className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
              {estado(u)}
              {NOMBRE_ROL[u.rol]}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

function AccionesUsuario({
  usuario,
  esPropio,
  onCambiarRol,
}: {
  usuario: UsuarioApi
  esPropio: boolean
  onCambiarRol: (usuario: UsuarioApi) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Acciones de ${usuario.usuario}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={esPropio} onSelect={() => onCambiarRol(usuario)}>
          <UserCog aria-hidden="true" />
          {esPropio ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Mismas reglas que el backend (CrearUsuarioRequest).
const esquemaUsuario = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre completo.').max(120, 'Usa hasta 120 caracteres.'),
  usuario: z.string().trim().min(1, 'Escribe el usuario.').max(50, 'Usa hasta 50 caracteres.'),
  rol: z.string().min(1, 'Elige un rol.'),
  contrasena: z.string().min(1, 'Escribe la contraseña inicial.').max(72, 'Usa hasta 72 caracteres.'),
})

type FormularioUsuario = z.input<typeof esquemaUsuario>

const USUARIO_VACIO: FormularioUsuario = { nombre: '', usuario: '', rol: '', contrasena: '' }

function DialogoCrearUsuario({
  abierto,
  roles,
  onCerrar,
  onCreado,
}: {
  abierto: boolean
  roles: RolApi[]
  onCerrar: () => void
  onCreado: (usuario: UsuarioApi) => void
}) {
  const mensajeDeError = useMensajeDeError()
  const [errorApi, setErrorApi] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting },
  } = useForm<FormularioUsuario>({ resolver: zodResolver(esquemaUsuario), defaultValues: USUARIO_VACIO })

  function cerrar() {
    reset(USUARIO_VACIO)
    setErrorApi(null)
    onCerrar()
  }

  async function guardar(datos: FormularioUsuario) {
    setErrorApi(null)
    try {
      const creado = await crearUsuario({
        nombre: datos.nombre.trim(),
        usuario: datos.usuario.trim(),
        contrasena: datos.contrasena,
        rol: datos.rol as Rol,
      })
      reset(USUARIO_VACIO)
      onCreado(creado)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje === null) {
        return
      }
      if (e instanceof ErrorApi && e.status === 409) {
        setError('usuario', { message: mensaje }, { shouldFocus: true })
      } else {
        setErrorApi(mensaje)
      }
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">Crear usuario</DialogTitle>
          <DialogDescription>Asigna el rol con el que trabajará en la agencia.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(guardar)} className="flex flex-col gap-6">
          <FieldGroup className="gap-4">
            {errorApi && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear el usuario</AlertTitle>
                <AlertDescription>{errorApi}</AlertDescription>
              </Alert>
            )}
            <CampoTexto control={control} nombre="nombre" etiqueta="Nombre completo" autoComplete="name" />
            <CampoTexto control={control} nombre="usuario" etiqueta="Usuario" autoComplete="off" />
            <Controller
              control={control}
              name="rol"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="nuevo-rol">Rol</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="nuevo-rol"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.error ? 'nuevo-rol-error' : undefined}
                    >
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.nombre} value={r.nombre}>
                          {NOMBRE_ROL[r.nombre]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError id="nuevo-rol-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              control={control}
              name="contrasena"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="nueva-contrasena">Contraseña inicial</FieldLabel>
                  <CampoContrasena
                    {...field}
                    id="nueva-contrasena"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={
                      fieldState.error ? 'nueva-contrasena-ayuda nueva-contrasena-error' : 'nueva-contrasena-ayuda'
                    }
                  />
                  <FieldDescription id="nueva-contrasena-ayuda">
                    La persona la usará para entrar por primera vez.
                  </FieldDescription>
                  <FieldError id="nueva-contrasena-error" errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface PropsCampoTexto {
  control: ReturnType<typeof useForm<FormularioUsuario>>['control']
  nombre: 'nombre' | 'usuario'
  etiqueta: string
  autoComplete: string
}

function CampoTexto({ control, nombre, etiqueta, autoComplete }: PropsCampoTexto) {
  const id = `nuevo-${nombre}`
  return (
    <Controller
      control={control}
      name={nombre}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
          <Input
            {...field}
            id={id}
            autoComplete={autoComplete}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? `${id}-error` : undefined}
          />
          <FieldError id={`${id}-error`} errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

function DialogoCambiarRol({
  usuario,
  roles,
  onCerrar,
  onCambiado,
}: {
  usuario: UsuarioApi | null
  roles: RolApi[]
  onCerrar: () => void
  onCambiado: (usuario: UsuarioApi) => void
}) {
  const mensajeDeError = useMensajeDeError()
  const [nuevoRol, setNuevoRol] = useState<Rol | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [abiertoPara, setAbiertoPara] = useState<number | null>(null)

  // Al abrir para otra persona se parte de su rol actual.
  if (usuario && abiertoPara !== usuario.id) {
    setAbiertoPara(usuario.id)
    setNuevoRol(usuario.rol)
    setError(null)
  }

  async function guardar() {
    if (!usuario || !nuevoRol) {
      return
    }
    if (nuevoRol === usuario.rol) {
      onCerrar()
      setAbiertoPara(null)
      return
    }
    setGuardando(true)
    setError(null)
    try {
      const actualizado = await cambiarRol(usuario.id, nuevoRol)
      setAbiertoPara(null)
      onCambiado(actualizado)
    } catch (e) {
      const mensaje = mensajeDeError(e)
      if (mensaje !== null) {
        setError(mensaje)
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog
      open={usuario !== null}
      onOpenChange={(abrir) => {
        if (!abrir) {
          setAbiertoPara(null)
          onCerrar()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">Cambiar rol</DialogTitle>
          <DialogDescription>
            {usuario ? `${usuario.nombre} (${usuario.usuario})` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="cambiar-rol">Nuevo rol</Label>
            <Select value={nuevoRol} onValueChange={(valor) => setNuevoRol(valor as Rol)}>
              <SelectTrigger id="cambiar-rol" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.nombre} value={r.nombre}>
                    {NOMBRE_ROL[r.nombre]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Los permisos cambian en cuanto la persona vuelva a iniciar sesión.
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setAbiertoPara(null)
              onCerrar()
            }}
          >
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
