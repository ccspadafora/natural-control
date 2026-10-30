/** Cartograma Colombia — mismo layout que el prototipo (columna, fila). */
export type DepartmentTile = {
  code: string
  name: string
  col: number
  row: number
}

export const DEPS: DepartmentTile[] = [
  { code: "ATL", name: "Atlántico", col: 2, row: 0 },
  { code: "MAG", name: "Magdalena", col: 3, row: 0 },
  { code: "GUA", name: "La Guajira", col: 4, row: 0 },
  { code: "SUC", name: "Sucre", col: 1, row: 1 },
  { code: "BOL", name: "Bolívar", col: 2, row: 1 },
  { code: "CES", name: "Cesar", col: 3, row: 1 },
  { code: "COR", name: "Córdoba", col: 1, row: 2 },
  { code: "ANT", name: "Antioquia", col: 2, row: 2 },
  { code: "SAN", name: "Santander", col: 3, row: 2 },
  { code: "NSA", name: "N. de Santander", col: 4, row: 2 },
  { code: "CHO", name: "Chocó", col: 0, row: 3 },
  { code: "RIS", name: "Risaralda", col: 1, row: 3 },
  { code: "CAL", name: "Caldas", col: 2, row: 3 },
  { code: "BOY", name: "Boyacá", col: 3, row: 3 },
  { code: "ARA", name: "Arauca", col: 4, row: 3 },
  { code: "VAL", name: "Valle", col: 0, row: 4 },
  { code: "QUI", name: "Quindío", col: 1, row: 4 },
  { code: "TOL", name: "Tolima", col: 2, row: 4 },
  { code: "CUN", name: "Cundinamarca", col: 3, row: 4 },
  { code: "CAS", name: "Casanare", col: 4, row: 4 },
  { code: "CAU", name: "Cauca", col: 0, row: 5 },
  { code: "HUI", name: "Huila", col: 2, row: 5 },
  { code: "MET", name: "Meta", col: 3, row: 5 },
  { code: "VIC", name: "Vichada", col: 4, row: 5 },
  { code: "NAR", name: "Nariño", col: 0, row: 6 },
  { code: "PUT", name: "Putumayo", col: 1, row: 6 },
  { code: "CAQ", name: "Caquetá", col: 2, row: 6 },
  { code: "GUV", name: "Guaviare", col: 3, row: 6 },
  { code: "GUN", name: "Guainía", col: 4, row: 6 },
  { code: "AMA", name: "Amazonas", col: 2, row: 7 },
  { code: "VAU", name: "Vaupés", col: 3, row: 7 },
]

export const TILE_SIZE = 76
export const TILE_GAP = 6
