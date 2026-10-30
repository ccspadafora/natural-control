from decimal import Decimal

from apps.catalog.price_pdf import money, sku_for, zone_code_for_pdf
from apps.crm.client_import import zone_code


def test_colombian_thousands_become_a_whole_amount():
    assert money("$ 52.000") == Decimal("52000")
    assert money("1.069.000") == Decimal("1069000")
    assert money("52.313") == Decimal("52313")


def test_each_pdf_maps_to_its_zone_and_the_vademecum_does_not():
    assert zone_code_for_pdf("LISTA DE PRECIOS ORIENTE ANTIOQUEÑO 2025.pdf") == "ORIENTE"
    assert zone_code_for_pdf("LISTA DE PRECIO PUBLICO PAMPLONA Y NORTE DE SANTANDER - 2025.pdf") == "NSANTANDER"
    assert zone_code_for_pdf("VADEMECUM NC.pdf") is None


def test_a_presentation_keeps_its_own_sku():
    assert sku_for("ANISAGRO", "500 g") != sku_for("ANISAGRO", "5 kg")


def test_antioquia_does_not_borrow_a_list_outside_oriente_and_uraba():
    assert zone_code("Antioquia", "La Ceja") == "ORIENTE"
    assert zone_code("Antioquia", "Apartadó") == "URABA"
    assert zone_code("Antioquia", "Medellín") is None
    assert zone_code("Caldas", "Manizales") is None
    assert zone_code("Tolima", "Ibagué") == "TOLIMA"
