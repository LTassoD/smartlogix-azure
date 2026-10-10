package cl.duoc.smartlogix.rabbitadmin.dto;

/** Respuesta uniforme de la API de administración. */
public record AdminResponse(String operation, String resource, String name, String detail) {
}
