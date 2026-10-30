import { FormEvent, useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Button, TextField } from "@nc/ui"
import { ConsoleShell } from "./admin"

type Product = {
  id: string
  sku: string
  name: string
  presentation: string
  category_id: string
  category_name: string
  unit: string
  unit_size: string
  is_active: boolean
  is_available: boolean
}

type Category = { id: string; name: string }
type PriceListRow = { id: string; name: string; zone_name: string; valid_from: string; price_count: number }

const UNITS = [
  { value: "KG", label: "Kilogramo" },
  { value: "L", label: "Litro" },
  { value: "GAL", label: "Galón" },
  { value: "UNIDAD", label: "Unidad" },
]

function pesos(value: string | null) {
  if (!value) return ""
  return String(Math.round(Number(value)))
}

export function ProductsPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [rows, setRows] = useState<Product[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    api<{ results: Product[] }>("/api/v1/catalog/products")
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [])

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Productos"
      lede="Cada presentación es un producto distinto."
      action={<Link className="nc-btn nc-btn-primary" to="/consola/productos/nuevo">Nuevo producto</Link>}
    >
      {notice ? <p className="nc-ok">{notice}</p> : null}
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Presentación</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id}>
                <td className="nc-key">{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.presentation}</td>
                <td>{product.category_name}</td>
                <td><span className={product.is_active ? "nc-status is-on" : "nc-status"}><i />{product.is_active ? "Activo" : "Inactivo"}</span></td>
                <td><Link to={`/consola/productos/${product.id}`}>Editar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

function ProductForm({
  user,
  onLogout,
  product,
}: {
  user: SessionUser
  onLogout: () => void
  product?: Product
}) {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [sku, setSku] = useState(product?.sku || "")
  const [name, setName] = useState(product?.name || "")
  const [presentation, setPresentation] = useState(product?.presentation || "")
  const [categoryId, setCategoryId] = useState(product?.category_id || "")
  const [unit, setUnit] = useState(product?.unit || "KG")
  const [unitSize, setUnitSize] = useState(product?.unit_size || "")
  const [active, setActive] = useState(product?.is_active ?? true)
  const [error, setError] = useState("")

  useEffect(() => {
    api<{ results: Category[] }>("/api/v1/catalog/categories").then((data) => {
      setCategories(data.results)
      setCategoryId((current) => current || data.results[0]?.id || "")
    })
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const body = {
      sku,
      name,
      presentation,
      category_id: categoryId,
      unit,
      unit_size: unitSize,
      is_active: active,
      is_available: active,
    }
    try {
      if (product) {
        await api(`/api/v1/catalog/products/${product.id}`, { method: "PATCH", body: JSON.stringify(body) })
      } else {
        await api("/api/v1/catalog/products", { method: "POST", body: JSON.stringify(body) })
      }
      navigate("/consola/productos", { state: { notice: product ? `${name} quedó actualizado.` : `${name} quedó creado. El precio se define en cada lista.` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title={product ? product.name : "Nuevo producto"}
      lede="El código identifica esta presentación. Otra presentación es otro producto."
      back={{ to: "/consola/productos", label: "Productos" }}
    >
      <form className="nc-panel" onSubmit={submit}>
        <TextField label="Código" value={sku} onChange={(event) => setSku(event.target.value)} required />
        <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} required />
        <TextField label="Presentación" value={presentation} onChange={(event) => setPresentation(event.target.value)} required />
        <label className="nc-field">
          <span className="nc-field-label">Categoría</span>
          <select className="nc-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="nc-field">
          <span className="nc-field-label">Unidad</span>
          <select className="nc-input" value={unit} onChange={(event) => setUnit(event.target.value)}>
            {UNITS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <TextField label="Tamaño" value={unitSize} onChange={(event) => setUnitSize(event.target.value)} required />
        <label className="nc-check">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Activo
        </label>
        {error ? <p className="nc-note">{error}</p> : null}
        <div className="nc-panel-actions">
          <Button type="submit">{product ? "Guardar producto" : "Crear producto"}</Button>
          <Link className="nc-text-link" to="/consola/productos">Cancelar</Link>
        </div>
      </form>
    </ConsoleShell>
  )
}

export function NewProductPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return <ProductForm user={user} onLogout={onLogout} />
}

export function EditProductPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { productId } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api<{ results: Product[] }>("/api/v1/catalog/products").then((data) => {
      const found = data.results.find((item) => item.id === productId)
      if (!found) setMissing(true)
      else setProduct(found)
    })
  }, [productId])

  if (missing) {
    return (
      <ConsoleShell user={user} onLogout={onLogout} title="Producto" back={{ to: "/consola/productos", label: "Productos" }}>
        <p className="nc-note">No encontramos ese producto.</p>
      </ConsoleShell>
    )
  }
  if (!product) return null
  return <ProductForm key={product.id} user={user} onLogout={onLogout} product={product} />
}

export function PriceListsPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice || ""
  const [rows, setRows] = useState<PriceListRow[]>([])

  useEffect(() => {
    api<{ results: PriceListRow[] }>("/api/v1/catalog/price-lists").then((data) => setRows(data.results))
  }, [])

  return (
    <ConsoleShell user={user} onLogout={onLogout} title="Precios" lede="Cada zona tiene su lista. No hay un precio único de la compañía.">
      {notice ? <p className="nc-ok">{notice}</p> : null}
      <div className="nc-table-wrap">
        <table className="nc-table">
          <thead>
            <tr>
              <th>Lista</th>
              <th>Zona</th>
              <th>Vigente desde</th>
              <th>Productos con precio</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.zone_name || "—"}</td>
                <td>{row.valid_from}</td>
                <td>{row.price_count}</td>
                <td><Link to={`/consola/precios/${row.id}`}>Editar precios</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ConsoleShell>
  )
}

type SheetProduct = { id: string; sku: string; name: string; presentation: string; unit_price: string | null }

export function PriceSheetPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { listId } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [zone, setZone] = useState("")
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [products, setProducts] = useState<SheetProduct[]>([])
  const [error, setError] = useState("")
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    api<{ name: string; zone_name: string; products: SheetProduct[] }>(`/api/v1/catalog/price-lists/${listId}/prices`)
      .then((data) => {
        setName(data.name)
        setZone(data.zone_name)
        setProducts(data.products)
        setAmounts(Object.fromEntries(data.products.map((item) => [item.id, pesos(item.unit_price)])))
      })
      .catch(() => setMissing(true))
  }, [listId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    try {
      await api(`/api/v1/catalog/price-lists/${listId}/prices`, {
        method: "PUT",
        body: JSON.stringify({
          prices: products.map((item) => ({
            product_id: item.id,
            unit_price: (amounts[item.id] || "").replace(/\D/g, "") || null,
          })),
        }),
      })
      navigate("/consola/precios", { state: { notice: `Los precios de ${name} quedaron guardados.` } })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar")
    }
  }

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title={name || "Lista de precios"}
      lede={zone ? `Lista de ${zone}. El valor es el precio unitario en pesos.` : undefined}
      back={{ to: "/consola/precios", label: "Precios" }}
    >
      {missing ? <p className="nc-note">No encontramos esa lista.</p> : (
        <form onSubmit={submit}>
          <div className="nc-table-wrap">
            <table className="nc-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Presentación</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.presentation}</td>
                    <td>
                      <input
                        className="nc-input nc-price"
                        inputMode="numeric"
                        aria-label={`Precio de ${product.name}`}
                        value={amounts[product.id] || ""}
                        onChange={(event) => setAmounts((current) => ({ ...current, [product.id]: event.target.value.replace(/\D/g, "") }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error ? <p className="nc-note">{error}</p> : null}
          <div className="nc-panel-actions" style={{ marginTop: 16 }}>
            <Button type="submit">Guardar precios</Button>
            <Link className="nc-text-link" to="/consola/precios">Cancelar</Link>
          </div>
        </form>
      )}
    </ConsoleShell>
  )
}
