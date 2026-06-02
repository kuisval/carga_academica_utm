-- =============================================================
--  SISTEMA DE CARGA ACADÉMICA - UTM
--  Base de datos SQL Server
-- =============================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'carga_academica_utm')
    CREATE DATABASE carga_academica_utm;
GO

USE carga_academica_utm;
GO

-- =============================================================
--  LIMPIEZA (re-ejecutable limpio)
-- =============================================================
IF OBJECT_ID('trg_linea_carga_delete',  'TR') IS NOT NULL DROP TRIGGER trg_linea_carga_delete;
IF OBJECT_ID('trg_linea_carga_insert',  'TR') IS NOT NULL DROP TRIGGER trg_linea_carga_insert;
IF OBJECT_ID('vista_carga_alumno',      'V')  IS NOT NULL DROP VIEW  vista_carga_alumno;
IF OBJECT_ID('vista_grupos_disponibles','V')  IS NOT NULL DROP VIEW  vista_grupos_disponibles;
IF OBJECT_ID('linea_carga',    'U') IS NOT NULL DROP TABLE linea_carga;
IF OBJECT_ID('carga_academica','U') IS NOT NULL DROP TABLE carga_academica;
IF OBJECT_ID('grupo',          'U') IS NOT NULL DROP TABLE grupo;
IF OBJECT_ID('oferta_academica','U')IS NOT NULL DROP TABLE oferta_academica;
IF OBJECT_ID('alumno',         'U') IS NOT NULL DROP TABLE alumno;
IF OBJECT_ID('coordinador',    'U') IS NOT NULL DROP TABLE coordinador;
IF OBJECT_ID('docente',        'U') IS NOT NULL DROP TABLE docente;
IF OBJECT_ID('usuario',        'U') IS NOT NULL DROP TABLE usuario;
IF OBJECT_ID('materia',        'U') IS NOT NULL DROP TABLE materia;
IF OBJECT_ID('aula',           'U') IS NOT NULL DROP TABLE aula;
IF OBJECT_ID('horario',        'U') IS NOT NULL DROP TABLE horario;
IF OBJECT_ID('carrera',        'U') IS NOT NULL DROP TABLE carrera;
GO

-- =============================================================
--  1. CARRERA
-- =============================================================
CREATE TABLE carrera (
    id_carrera  INT          NOT NULL IDENTITY(1,1),
    clave       VARCHAR(20)  NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    CONSTRAINT pk_carrera PRIMARY KEY (id_carrera),
    CONSTRAINT uk_carrera UNIQUE (clave)
);
GO

-- =============================================================
--  2. USUARIO  ← supertabla de autenticación
--     Login unificado por correo electrónico para todos los roles
--     tipo: 'alumno' | 'coordinador' | 'docente'
-- =============================================================
CREATE TABLE usuario (
    id_usuario  INT          NOT NULL IDENTITY(1,1),
    email       VARCHAR(150) NOT NULL,
    password    VARCHAR(255) NOT NULL DEFAULT 'utm2025',
    nombre      VARCHAR(150) NOT NULL,
    tipo        VARCHAR(12)  NOT NULL,
    CONSTRAINT pk_usuario       PRIMARY KEY (id_usuario),
    CONSTRAINT uk_usuario_email UNIQUE (email),
    CONSTRAINT chk_usuario_tipo CHECK (tipo IN ('alumno','coordinador','docente'))
);
GO

-- =============================================================
--  3. ALUMNO  (subtabla)
--     matricula: número de control — solo para identificación interna,
--                el login se hace con el email de usuario
-- =============================================================
CREATE TABLE alumno (
    id_alumno   INT         NOT NULL,
    matricula   VARCHAR(20) NOT NULL,
    semestre    TINYINT     NOT NULL,
    tipo_alumno VARCHAR(10) NOT NULL DEFAULT 'regular',
    estado_pago VARCHAR(10) NOT NULL DEFAULT 'adeudo',
    id_carrera  INT         NOT NULL,
    CONSTRAINT pk_alumno         PRIMARY KEY (id_alumno),
    CONSTRAINT uk_alumno_mat     UNIQUE (matricula),
    CONSTRAINT chk_alumno_tipo   CHECK (tipo_alumno IN ('regular','irregular')),
    CONSTRAINT chk_alumno_pago   CHECK (estado_pago IN ('vigente','adeudo')),
    CONSTRAINT fk_alumno_usuario FOREIGN KEY (id_alumno)  REFERENCES usuario(id_usuario),
    CONSTRAINT fk_alumno_carrera FOREIGN KEY (id_carrera) REFERENCES carrera(id_carrera)
);
GO

-- =============================================================
--  4. COORDINADOR  (subtabla)
-- =============================================================
CREATE TABLE coordinador (
    id_coordinador INT NOT NULL,
    id_carrera     INT NOT NULL,
    CONSTRAINT pk_coordinador    PRIMARY KEY (id_coordinador),
    CONSTRAINT fk_coord_usuario  FOREIGN KEY (id_coordinador) REFERENCES usuario(id_usuario),
    CONSTRAINT fk_coord_carrera  FOREIGN KEY (id_carrera)     REFERENCES carrera(id_carrera)
);
GO

-- =============================================================
--  5. DOCENTE  (subtabla)
-- =============================================================
CREATE TABLE docente (
    id_docente   INT          NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    CONSTRAINT pk_docente         PRIMARY KEY (id_docente),
    CONSTRAINT fk_docente_usuario FOREIGN KEY (id_docente) REFERENCES usuario(id_usuario)
);
GO

-- =============================================================
--  6. MATERIA
-- =============================================================
CREATE TABLE materia (
    id_materia INT          NOT NULL IDENTITY(1,1),
    clave      VARCHAR(20)  NOT NULL,
    nombre     VARCHAR(150) NOT NULL,
    creditos   TINYINT      NOT NULL,
    id_carrera INT          NOT NULL,
    CONSTRAINT pk_materia         PRIMARY KEY (id_materia),
    CONSTRAINT uk_materia_clave   UNIQUE (clave),
    CONSTRAINT fk_materia_carrera FOREIGN KEY (id_carrera) REFERENCES carrera(id_carrera)
);
GO

-- =============================================================
--  7. AULA
-- =============================================================
CREATE TABLE aula (
    id_aula   INT         NOT NULL IDENTITY(1,1),
    numero    INT         NOT NULL,
    edificio  VARCHAR(50) NOT NULL,
    capacidad INT         NOT NULL,
    CONSTRAINT pk_aula PRIMARY KEY (id_aula),
    CONSTRAINT uk_aula UNIQUE (numero, edificio)
);
GO

-- =============================================================
--  8. HORARIO
-- =============================================================
CREATE TABLE horario (
    id_horario  INT         NOT NULL IDENTITY(1,1),
    dias        VARCHAR(50) NOT NULL,
    hora_inicio TIME        NOT NULL,
    hora_fin    TIME        NOT NULL,
    CONSTRAINT pk_horario PRIMARY KEY (id_horario)
);
GO

-- =============================================================
--  9. OFERTA_ACADEMICA
--     estado: 'borrador' | 'publicada'
-- =============================================================
CREATE TABLE oferta_academica (
    id_oferta      INT         NOT NULL IDENTITY(1,1),
    periodo        VARCHAR(20) NOT NULL,
    estado         VARCHAR(10) NOT NULL DEFAULT 'borrador',
    id_carrera     INT         NOT NULL,
    id_coordinador INT         NOT NULL,
    CONSTRAINT pk_oferta         PRIMARY KEY (id_oferta),
    CONSTRAINT chk_oferta_estado CHECK (estado IN ('borrador','publicada')),
    CONSTRAINT fk_oferta_carrera FOREIGN KEY (id_carrera)     REFERENCES carrera(id_carrera),
    CONSTRAINT fk_oferta_coord   FOREIGN KEY (id_coordinador) REFERENCES coordinador(id_coordinador)
);
GO

-- =============================================================
--  10. GRUPO
--      estado: 'disponible' | 'lleno' | 'cancelado'
-- =============================================================
CREATE TABLE grupo (
    id_grupo        INT         NOT NULL IDENTITY(1,1),
    clave           VARCHAR(20) NOT NULL,
    cupo_max        INT         NOT NULL,
    cupo_disponible INT         NOT NULL,
    estado          VARCHAR(12) NOT NULL DEFAULT 'disponible',
    id_materia      INT         NOT NULL,
    id_docente      INT         NOT NULL,
    id_aula         INT         NOT NULL,
    id_horario      INT         NOT NULL,
    id_oferta       INT         NOT NULL,
    CONSTRAINT pk_grupo           PRIMARY KEY (id_grupo),
    CONSTRAINT chk_grupo_estado   CHECK (estado IN ('disponible','lleno','cancelado')),
    CONSTRAINT uk_aula_horario    UNIQUE (id_aula,    id_horario),
    CONSTRAINT uk_docente_horario UNIQUE (id_docente, id_horario),
    CONSTRAINT fk_grupo_materia   FOREIGN KEY (id_materia) REFERENCES materia(id_materia),
    CONSTRAINT fk_grupo_docente   FOREIGN KEY (id_docente) REFERENCES docente(id_docente),
    CONSTRAINT fk_grupo_aula      FOREIGN KEY (id_aula)    REFERENCES aula(id_aula),
    CONSTRAINT fk_grupo_horario   FOREIGN KEY (id_horario) REFERENCES horario(id_horario),
    CONSTRAINT fk_grupo_oferta    FOREIGN KEY (id_oferta)  REFERENCES oferta_academica(id_oferta)
);
GO

-- =============================================================
--  11. CARGA_ACADEMICA
--      Un alumno solo puede tener una carga por periodo
-- =============================================================
CREATE TABLE carga_academica (
    id_carga     INT         NOT NULL IDENTITY(1,1),
    periodo      VARCHAR(20) NOT NULL,
    estado       VARCHAR(11) NOT NULL DEFAULT 'en_proceso',
    total_grupos TINYINT     NOT NULL DEFAULT 0,
    id_alumno    INT         NOT NULL,
    CONSTRAINT pk_carga          PRIMARY KEY (id_carga),
    CONSTRAINT chk_carga_estado  CHECK (estado IN ('en_proceso','finalizada','cancelada')),
    CONSTRAINT uk_alumno_periodo UNIQUE (id_alumno, periodo),
    CONSTRAINT fk_carga_alumno   FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno)
);
GO

-- =============================================================
--  12. LINEA_CARGA
-- =============================================================
CREATE TABLE linea_carga (
    id_linea INT NOT NULL IDENTITY(1,1),
    id_carga INT NOT NULL,
    id_grupo INT NOT NULL,
    CONSTRAINT pk_linea       PRIMARY KEY (id_linea),
    CONSTRAINT uk_carga_grupo UNIQUE (id_carga, id_grupo),
    CONSTRAINT fk_linea_carga FOREIGN KEY (id_carga) REFERENCES carga_academica(id_carga),
    CONSTRAINT fk_linea_grupo FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo)
);
GO

-- =============================================================
--  TRIGGERS
-- =============================================================
CREATE TRIGGER trg_linea_carga_insert
ON linea_carga AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE grupo
    SET cupo_disponible = cupo_disponible - 1,
        estado = CASE WHEN cupo_disponible - 1 <= 0 THEN 'lleno' ELSE 'disponible' END
    WHERE id_grupo IN (SELECT id_grupo FROM inserted);

    UPDATE carga_academica
    SET total_grupos = total_grupos + 1
    WHERE id_carga IN (SELECT id_carga FROM inserted);
END;
GO

CREATE TRIGGER trg_linea_carga_delete
ON linea_carga AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE grupo
    SET cupo_disponible = cupo_disponible + 1,
        estado = 'disponible'
    WHERE id_grupo IN (SELECT id_grupo FROM deleted);

    UPDATE carga_academica
    SET total_grupos = total_grupos - 1
    WHERE id_carga IN (SELECT id_carga FROM deleted);
END;
GO

-- =============================================================
--  VISTAS
-- =============================================================
CREATE VIEW vista_grupos_disponibles AS
SELECT
    g.id_grupo,
    g.clave              AS grupo_clave,
    m.nombre             AS materia,
    m.creditos,
    ud.nombre            AS docente,
    a.numero             AS aula_numero,
    a.edificio,
    h.dias,
    h.hora_inicio,
    h.hora_fin,
    g.cupo_disponible,
    g.cupo_max,
    c.nombre             AS carrera,
    oa.periodo
FROM grupo g
JOIN materia m           ON g.id_materia  = m.id_materia
JOIN docente d           ON g.id_docente  = d.id_docente
JOIN usuario ud          ON d.id_docente  = ud.id_usuario
JOIN aula a              ON g.id_aula     = a.id_aula
JOIN horario h           ON g.id_horario  = h.id_horario
JOIN oferta_academica oa ON g.id_oferta   = oa.id_oferta
JOIN carrera c           ON oa.id_carrera = c.id_carrera
WHERE g.estado = 'disponible'
  AND oa.estado = 'publicada';
GO

CREATE VIEW vista_carga_alumno AS
SELECT
    al.matricula,
    ua.nombre            AS alumno,
    ua.email,
    ca.periodo,
    ca.estado            AS estado_carga,
    ca.total_grupos,
    m.nombre             AS materia,
    g.clave              AS grupo,
    ud.nombre            AS docente,
    h.dias,
    h.hora_inicio,
    h.hora_fin,
    a.numero             AS aula,
    a.edificio
FROM carga_academica ca
JOIN alumno al           ON ca.id_alumno = al.id_alumno
JOIN usuario ua          ON al.id_alumno = ua.id_usuario
JOIN linea_carga lc      ON lc.id_carga  = ca.id_carga
JOIN grupo g             ON lc.id_grupo  = g.id_grupo
JOIN materia m           ON g.id_materia = m.id_materia
JOIN docente d           ON g.id_docente = d.id_docente
JOIN usuario ud          ON d.id_docente = ud.id_usuario
JOIN horario h           ON g.id_horario = h.id_horario
JOIN aula a              ON g.id_aula    = a.id_aula;
GO

-- =============================================================
--  DATOS DE PRUEBA
-- =============================================================
INSERT INTO carrera (clave, nombre)
VALUES ('ISC', 'Ingeniería en Sistemas Computacionales');
GO

INSERT INTO usuario (email, password, nombre, tipo) VALUES
('juan.perez@utm.edu.mx',     'utm2025', 'Juan Pérez García',        'alumno'),
('dinorah.meza@utm.edu.mx',   'utm2025', 'M.C. Dinorah Meza García', 'coordinador'),
('tomas.aguilar@utm.edu.mx',  'utm2025', 'Dr. Tomás Aguilar Vega',   'docente');
GO

INSERT INTO alumno (id_alumno, matricula, semestre, tipo_alumno, estado_pago, id_carrera)
VALUES (1, '2021001234', 3, 'regular', 'vigente', 1);
GO

INSERT INTO coordinador (id_coordinador, id_carrera)
VALUES (2, 1);
GO

INSERT INTO docente (id_docente, especialidad)
VALUES (3, 'Bases de Datos');
GO

-- =============================================================
--  DATOS DE PRUEBA — Carga Académica UTM
--  Alumno: Juan Pérez García (id=1, semestre 3, regular, vigente)
--  Carrera: ISC (id=1)
--  Coordinador: M.C. Dinorah Meza García (id=2)
--  Docente: Dr. Tomás Aguilar Vega (id=3)
-- =============================================================

USE carga_academica_utm;
GO
 
-- =============================================================
--  1. MATERIAS de 3er semestre — ISC
-- =============================================================
INSERT INTO materia (clave, nombre, creditos, id_carrera) VALUES
('ISC301', 'Estructura de Datos',          8, 1),
('ISC302', 'Bases de Datos',               8, 1),
('ISC303', 'Matemáticas Discretas',        6, 1),
('ISC304', 'Programación Orientada a Obj', 8, 1),
('ISC305', 'Sistemas Operativos',          6, 1),
('ISC306', 'Inglés III',                   4, 1),
('ISC307', 'Cálculo Diferencial',          6, 1);
GO
 
-- =============================================================
--  2. AULAS
-- =============================================================
INSERT INTO aula (numero, edificio, capacidad) VALUES
(101, 'A', 30),
(102, 'A', 30),
(201, 'B', 25),
(202, 'B', 25),
(301, 'C', 20);
GO
 
-- =============================================================
--  3. HORARIOS
--     Lunes-Miércoles-Viernes y Martes-Jueves
-- =============================================================
INSERT INTO horario (dias, hora_inicio, hora_fin) VALUES
('Lunes-Miércoles-Viernes', '07:00', '08:30'),   -- id 1
('Lunes-Miércoles-Viernes', '08:30', '10:00'),   -- id 2
('Lunes-Miércoles-Viernes', '10:00', '11:30'),   -- id 3
('Lunes-Miércoles-Viernes', '11:30', '13:00'),   -- id 4
('Martes-Jueves',           '07:00', '09:00'),   -- id 5
('Martes-Jueves',           '09:00', '11:00'),   -- id 6
('Martes-Jueves',           '11:00', '13:00'),   -- id 7
('Martes-Jueves',           '13:00', '15:00');   -- id 8
GO
 
-- =============================================================
--  4. OFERTA ACADÉMICA — publicada para el periodo 2025-A
-- =============================================================
INSERT INTO oferta_academica (periodo, estado, id_carrera, id_coordinador)
VALUES ('2025-A', 'publicada', 1, 2);
GO
-- id_oferta = 1
 
-- =============================================================
--  5. GRUPOS
--     Restricciones a respetar:
--       · uk_aula_horario    (id_aula, id_horario) únicos
--       · uk_docente_horario (id_docente, id_horario) únicos
--     El docente Tomás (id=3) solo puede estar en un horario a la vez,
--     por eso cada grupo tiene un horario diferente.
--     cupo_max=25, cupo_disponible=25 al inicio.
-- =============================================================
INSERT INTO grupo (clave, cupo_max, cupo_disponible, estado, id_materia, id_docente, id_aula, id_horario, id_oferta)
VALUES
--  Materia               Materia  Docente  Aula  Horario  Oferta
('ED-A',   25, 25, 'disponible', 1, 3, 1, 1, 1),   -- Estructura de Datos     · LMV 07-08:30  · Aula A101
('BD-A',   25, 25, 'disponible', 2, 3, 2, 2, 1),   -- Bases de Datos          · LMV 08:30-10  · Aula A102
('MD-A',   25, 25, 'disponible', 3, 3, 3, 3, 1),   -- Matemáticas Discretas   · LMV 10-11:30  · Aula B201
('POO-A',  25, 25, 'disponible', 4, 3, 4, 4, 1),   -- Programación OO         · LMV 11:30-13  · Aula B202
('SO-A',   25, 25, 'disponible', 5, 3, 5, 5, 1),   -- Sistemas Operativos     · MJ  07-09     · Aula C301
('ING-A',  25, 25, 'disponible', 6, 3, 1, 6, 1),   -- Inglés III              · MJ  09-11     · Aula A101
('CALC-A', 25, 25, 'disponible', 7, 3, 2, 7, 1);   -- Cálculo Diferencial     · MJ  11-13     · Aula A102
GO
 
-- =============================================================
--  VERIFICACIÓN — muestra lo que quedó disponible para Juan
-- =============================================================
SELECT
    g.clave              AS grupo,
    m.nombre             AS materia,
    m.creditos,
    h.dias,
    CONVERT(VARCHAR(5), h.hora_inicio) AS inicio,
    CONVERT(VARCHAR(5), h.hora_fin)    AS fin,
    a.numero             AS aula,
    a.edificio,
    g.cupo_disponible
FROM grupo g
JOIN materia          m  ON g.id_materia = m.id_materia
JOIN horario          h  ON g.id_horario = h.id_horario
JOIN aula             a  ON g.id_aula    = a.id_aula
JOIN oferta_academica oa ON g.id_oferta  = oa.id_oferta
WHERE oa.periodo = '2025-A'
  AND oa.estado  = 'publicada'
  AND g.estado   = 'disponible'
ORDER BY h.hora_inicio;
GO

-- =============================================================
--  FIX: ajusta los horarios al rango visible del WeekGrid
--  El grid por defecto muestra 07:00–20:00 con h1=20
--  Todos los horarios quedan dentro del rango 07:00–15:00
--  para que entren sin tener que cambiar opciones del grid.
--  Si ya tienes los datos insertados, este UPDATE los corrige.
-- =============================================================
 
USE carga_academica_utm;
GO
 
-- Verificar antes cómo están
SELECT id_horario, dias,
       CONVERT(VARCHAR(5), hora_inicio, 108) AS inicio,
       CONVERT(VARCHAR(5), hora_fin,    108) AS fin
FROM horario
ORDER BY id_horario;
GO
 
-- Los horarios MJ de tarde (ids 7 y 8) caen fuera del rango
-- visible por defecto (h0=7, h1=15). Los ajustamos a mañana.
-- Si prefieres ampliar el grid en vez de mover los horarios,
-- usa la opción B de abajo.
 
-- OPCIÓN A — mover los horarios de tarde a mañana (recomendado para pruebas)
UPDATE horario SET hora_inicio = '07:00', hora_fin = '09:00' WHERE id_horario = 5;
UPDATE horario SET hora_inicio = '09:00', hora_fin = '11:00' WHERE id_horario = 6;
UPDATE horario SET hora_inicio = '11:00', hora_fin = '13:00' WHERE id_horario = 7;
UPDATE horario SET hora_inicio = '13:00', hora_fin = '15:00' WHERE id_horario = 8;
GO
 
-- Verificar resultado
SELECT id_horario, dias,
       CONVERT(VARCHAR(5), hora_inicio, 108) AS inicio,
       CONVERT(VARCHAR(5), hora_fin,    108) AS fin
FROM horario
ORDER BY id_horario;
GO

-- =============================================================
--  DATOS DE PRUEBA — Coordinador
--  El ScriptBD.sql ya insertó:
--    id=2 · M.C. Dinorah Meza García · coordinador
--    coordinador(id_coordinador=2, id_carrera=1)
--  Solo necesitamos verificar que exista y hacer login con:
--    Email:    dinorah.meza@utm.edu.mx
--    Password: utm2025
-- =============================================================

USE carga_academica_utm;
GO

-- ── Verificación rápida ───────────────────────────────────
SELECT
  u.id_usuario,
  u.nombre,
  u.email,
  u.tipo,
  c.nombre  AS carrera
FROM usuario     u
JOIN coordinador co ON co.id_coordinador = u.id_usuario
JOIN carrera     c  ON c.id_carrera      = co.id_carrera
WHERE u.tipo = 'coordinador';
GO

-- Si la consulta anterior no devuelve filas, ejecuta esto:
-- (solo si el ScriptBD.sql no se corrió completo)

/*
INSERT INTO usuario (email, password, nombre, tipo)
VALUES ('dinorah.meza@utm.edu.mx', 'utm2025', 'M.C. Dinorah Meza García', 'coordinador');
GO

-- Obtén el id que se generó
DECLARE @id INT = SCOPE_IDENTITY();

INSERT INTO coordinador (id_coordinador, id_carrera)
VALUES (@id, 1);
GO
*/

UPDATE oferta_academica
SET estado = 'borrador'
WHERE id_oferta = 1;


-- =============================================================
--  FIX: agrega campo semestre a la tabla materia
--  y actualiza los datos de prueba con el semestre correcto
-- =============================================================
 
USE carga_academica_utm;
GO
 
-- 1. Agregar columna semestre a materia
ALTER TABLE materia
  ADD semestre TINYINT NOT NULL DEFAULT 1;
GO
 
-- 2. Actualizar las materias de prueba con su semestre real
--    (las 7 materias que insertamos son de 3er semestre ISC)
UPDATE materia SET semestre = 3
WHERE id_carrera = 1
  AND clave IN ('ISC301','ISC302','ISC303','ISC304','ISC305','ISC306','ISC307');
GO
 
-- 3. Verificar
SELECT id_materia, clave, nombre, creditos, semestre
FROM materia
WHERE id_carrera = 1
ORDER BY semestre, clave;
GO

-- Materias con 8 créditos → 6
UPDATE materia SET creditos = 6 WHERE creditos = 8;

-- Materias con 7 créditos → 5
UPDATE materia SET creditos = 5 WHERE creditos = 7;

-- Verificar resultado
SELECT clave, nombre, creditos FROM materia ORDER BY creditos DESC;