export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acciones_operativas: {
        Row: {
          asignada_a: string
          comentario_resultado: string | null
          contexto: string | null
          contexto_ia: string | null
          created_at: string
          escalada_a: string | null
          estado: string
          fecha_completada: string | null
          feedback_compra_48h: boolean | null
          id: string
          mentora_id: string | null
          origen: string
          pospuesta_hasta: string | null
          prioridad: string
          razon_escalamiento: string | null
          regla_id: string | null
          resultado: string | null
          reto_id: string
          socia_reto_id: string
          tactica: string | null
          tipo: string
          titulo: string
          updated_at: string
          veces_pospuesta: number
        }
        Insert: {
          asignada_a: string
          comentario_resultado?: string | null
          contexto?: string | null
          contexto_ia?: string | null
          created_at?: string
          escalada_a?: string | null
          estado?: string
          fecha_completada?: string | null
          feedback_compra_48h?: boolean | null
          id?: string
          mentora_id?: string | null
          origen?: string
          pospuesta_hasta?: string | null
          prioridad?: string
          razon_escalamiento?: string | null
          regla_id?: string | null
          resultado?: string | null
          reto_id: string
          socia_reto_id: string
          tactica?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
          veces_pospuesta?: number
        }
        Update: {
          asignada_a?: string
          comentario_resultado?: string | null
          contexto?: string | null
          contexto_ia?: string | null
          created_at?: string
          escalada_a?: string | null
          estado?: string
          fecha_completada?: string | null
          feedback_compra_48h?: boolean | null
          id?: string
          mentora_id?: string | null
          origen?: string
          pospuesta_hasta?: string | null
          prioridad?: string
          razon_escalamiento?: string | null
          regla_id?: string | null
          resultado?: string | null
          reto_id?: string
          socia_reto_id?: string
          tactica?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
          veces_pospuesta?: number
        }
        Relationships: [
          {
            foreignKeyName: "acciones_operativas_regla_id_fkey"
            columns: ["regla_id"]
            isOneToOne: false
            referencedRelation: "reglas_metodo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "socias_reto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pareto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pipeline_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      activaciones: {
        Row: {
          aprobada_por: string | null
          categoria_foco: string | null
          creada_por: string | null
          created_at: string | null
          estado: string | null
          id: string
          mecanica: Json | null
          meta_activacion: number | null
          nombre: string
          objetivo: string | null
          resultado: number | null
          reto_id: string
          tipo: string | null
        }
        Insert: {
          aprobada_por?: string | null
          categoria_foco?: string | null
          creada_por?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          mecanica?: Json | null
          meta_activacion?: number | null
          nombre: string
          objetivo?: string | null
          resultado?: number | null
          reto_id: string
          tipo?: string | null
        }
        Update: {
          aprobada_por?: string | null
          categoria_foco?: string | null
          creada_por?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          mecanica?: Json | null
          meta_activacion?: number | null
          nombre?: string
          objetivo?: string | null
          resultado?: number | null
          reto_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activaciones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas: {
        Row: {
          asignada_a: string | null
          created_at: string | null
          estado: string | null
          id: string
          mensaje: string | null
          reto_id: string
          severidad: string
          socia_id: string | null
          tipo: string
        }
        Insert: {
          asignada_a?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          mensaje?: string | null
          reto_id: string
          severidad?: string
          socia_id?: string | null
          tipo: string
        }
        Update: {
          asignada_a?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          mensaje?: string | null
          reto_id?: string
          severidad?: string
          socia_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      analisis_ia: {
        Row: {
          contenido: Json
          created_at: string | null
          id: string
          mentora_id: string | null
          operador_id: string | null
          reto_id: string
          socia_id: string | null
          tipo: string
          vigencia_hasta: string | null
        }
        Insert: {
          contenido: Json
          created_at?: string | null
          id?: string
          mentora_id?: string | null
          operador_id?: string | null
          reto_id: string
          socia_id?: string | null
          tipo: string
          vigencia_hasta?: string | null
        }
        Update: {
          contenido?: Json
          created_at?: string | null
          id?: string
          mentora_id?: string | null
          operador_id?: string | null
          reto_id?: string
          socia_id?: string | null
          tipo?: string
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analisis_ia_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      cargas_ventas: {
        Row: {
          alertas: number
          archivo_nombre: string
          cargado_por: string
          created_at: string
          fecha: string
          id: string
          reto_id: string
          socias_con_error: number | null
          status: string | null
          total_socias: number
          venta_total_dia: number
        }
        Insert: {
          alertas?: number
          archivo_nombre: string
          cargado_por: string
          created_at?: string
          fecha: string
          id?: string
          reto_id: string
          socias_con_error?: number | null
          status?: string | null
          total_socias?: number
          venta_total_dia?: number
        }
        Update: {
          alertas?: number
          archivo_nombre?: string
          cargado_por?: string
          created_at?: string
          fecha?: string
          id?: string
          reto_id?: string
          socias_con_error?: number | null
          status?: string | null
          total_socias?: number
          venta_total_dia?: number
        }
        Relationships: [
          {
            foreignKeyName: "cargas_ventas_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      compromisos_mentora: {
        Row: {
          avance_empuje80: number | null
          avance_top20: number | null
          created_at: string | null
          id: string
          mentora_id: string
          plan_empuje80: Json | null
          plan_top20: Json | null
          reto_id: string
          semana: number
        }
        Insert: {
          avance_empuje80?: number | null
          avance_top20?: number | null
          created_at?: string | null
          id?: string
          mentora_id: string
          plan_empuje80?: Json | null
          plan_top20?: Json | null
          reto_id: string
          semana: number
        }
        Update: {
          avance_empuje80?: number | null
          avance_top20?: number | null
          created_at?: string | null
          id?: string
          mentora_id?: string
          plan_empuje80?: Json | null
          plan_top20?: Json | null
          reto_id?: string
          semana?: number
        }
        Relationships: [
          {
            foreignKeyName: "compromisos_mentora_mentora_id_fkey"
            columns: ["mentora_id"]
            isOneToOne: false
            referencedRelation: "mentoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compromisos_mentora_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      guias_contextuales: {
        Row: {
          contenido: string
          contexto: string | null
          created_at: string | null
          editado_por: string | null
          id: string
          rol: string
          semana: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          contenido: string
          contexto?: string | null
          created_at?: string | null
          editado_por?: string | null
          id?: string
          rol: string
          semana?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          contenido?: string
          contexto?: string | null
          created_at?: string | null
          editado_por?: string | null
          id?: string
          rol?: string
          semana?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      interacciones: {
        Row: {
          accion_id: string | null
          comentario: string | null
          created_at: string
          id: string
          mentora_id: string | null
          resultado: string | null
          reto_id: string
          socia_reto_id: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          accion_id?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          mentora_id?: string | null
          resultado?: string | null
          reto_id: string
          socia_reto_id: string
          tipo?: string
          usuario_id: string
        }
        Update: {
          accion_id?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          mentora_id?: string | null
          resultado?: string | null
          reto_id?: string
          socia_reto_id?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacciones_accion_id_fkey"
            columns: ["accion_id"]
            isOneToOne: false
            referencedRelation: "acciones_operativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacciones_accion_id_fkey"
            columns: ["accion_id"]
            isOneToOne: false
            referencedRelation: "vista_cola_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacciones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacciones_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "socias_reto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacciones_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pareto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacciones_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pipeline_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      items_llamada: {
        Row: {
          contexto: string | null
          created_at: string | null
          id: string
          intentos: number | null
          lista_id: string
          llamada_at: string | null
          nombre_socia: string | null
          operador_id: string | null
          resultado: string | null
          socia_id: string | null
          telefono: string | null
        }
        Insert: {
          contexto?: string | null
          created_at?: string | null
          id?: string
          intentos?: number | null
          lista_id: string
          llamada_at?: string | null
          nombre_socia?: string | null
          operador_id?: string | null
          resultado?: string | null
          socia_id?: string | null
          telefono?: string | null
        }
        Update: {
          contexto?: string | null
          created_at?: string | null
          id?: string
          intentos?: number | null
          lista_id?: string
          llamada_at?: string | null
          nombre_socia?: string | null
          operador_id?: string | null
          resultado?: string | null
          socia_id?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_llamada_lista_id_fkey"
            columns: ["lista_id"]
            isOneToOne: false
            referencedRelation: "listas_llamadas"
            referencedColumns: ["id"]
          },
        ]
      }
      listas_llamadas: {
        Row: {
          asignada_a: string | null
          creada_por: string | null
          created_at: string | null
          id: string
          motivo: string | null
          nombre: string
          reto_id: string
          status: string | null
        }
        Insert: {
          asignada_a?: string | null
          creada_por?: string | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          nombre: string
          reto_id: string
          status?: string | null
        }
        Update: {
          asignada_a?: string | null
          creada_por?: string | null
          created_at?: string | null
          id?: string
          motivo?: string | null
          nombre?: string
          reto_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listas_llamadas_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      mentoras: {
        Row: {
          activa: boolean
          auth_id: string | null
          created_at: string
          id: string
          id_socia: string | null
          nombre: string
          pin_acceso: string
          retos_count: number | null
          telefono: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          auth_id?: string | null
          created_at?: string
          id?: string
          id_socia?: string | null
          nombre: string
          pin_acceso: string
          retos_count?: number | null
          telefono: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          auth_id?: string | null
          created_at?: string
          id?: string
          id_socia?: string | null
          nombre?: string
          pin_acceso?: string
          retos_count?: number | null
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      metas_diarias_reto: {
        Row: {
          created_at: string
          dia_numero: number
          fecha: string
          id: string
          meta_acumulada_pct: number
          meta_acumulada_valor: number
          reto_id: string
          semana: number
          venta_real: number
        }
        Insert: {
          created_at?: string
          dia_numero: number
          fecha: string
          id?: string
          meta_acumulada_pct?: number
          meta_acumulada_valor?: number
          reto_id: string
          semana: number
          venta_real?: number
        }
        Update: {
          created_at?: string
          dia_numero?: number
          fecha?: string
          id?: string
          meta_acumulada_pct?: number
          meta_acumulada_valor?: number
          reto_id?: string
          semana?: number
          venta_real?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_diarias_reto_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      reglas_metodo: {
        Row: {
          accion_mensaje: string
          accion_tipo: string
          activa: boolean
          asignar_a_rol: string
          campo: string
          campo2: string | null
          condicion_extra: boolean
          created_at: string
          id: string
          logica_extra: string | null
          nombre: string
          operador: string
          operador2: string | null
          orden: number
          prioridad: string
          reto_id: string
          semanas_activas: number[]
          tactica_sugerida: string | null
          updated_at: string
          valor: string
          valor2: string | null
        }
        Insert: {
          accion_mensaje?: string
          accion_tipo?: string
          activa?: boolean
          asignar_a_rol?: string
          campo: string
          campo2?: string | null
          condicion_extra?: boolean
          created_at?: string
          id?: string
          logica_extra?: string | null
          nombre: string
          operador?: string
          operador2?: string | null
          orden?: number
          prioridad?: string
          reto_id: string
          semanas_activas?: number[]
          tactica_sugerida?: string | null
          updated_at?: string
          valor: string
          valor2?: string | null
        }
        Update: {
          accion_mensaje?: string
          accion_tipo?: string
          activa?: boolean
          asignar_a_rol?: string
          campo?: string
          campo2?: string | null
          condicion_extra?: boolean
          created_at?: string
          id?: string
          logica_extra?: string | null
          nombre?: string
          operador?: string
          operador2?: string | null
          orden?: number
          prioridad?: string
          reto_id?: string
          semanas_activas?: number[]
          tactica_sugerida?: string | null
          updated_at?: string
          valor?: string
          valor2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reglas_metodo_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      retos: {
        Row: {
          created_at: string
          created_by: string
          estado: Database["public"]["Enums"]["reto_estado"]
          fecha_fin: string
          fecha_inicio: string
          id: string
          meta_estandar: number
          nombre: string
          pesos_diarios: Json | null
          pesos_semanales: Json
          tiendas: string[] | null
          tipo_meta: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          estado?: Database["public"]["Enums"]["reto_estado"]
          fecha_fin: string
          fecha_inicio: string
          id?: string
          meta_estandar?: number
          nombre: string
          pesos_diarios?: Json | null
          pesos_semanales?: Json
          tiendas?: string[] | null
          tipo_meta?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          estado?: Database["public"]["Enums"]["reto_estado"]
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          meta_estandar?: number
          nombre?: string
          pesos_diarios?: Json | null
          pesos_semanales?: Json
          tiendas?: string[] | null
          tipo_meta?: string
          updated_at?: string
        }
        Relationships: []
      }
      score_mentoras: {
        Row: {
          created_at: string | null
          distribucion_socias: Json | null
          id: string
          mentora_id: string
          reto_id: string
          score_ponderado: number | null
          semana: number
        }
        Insert: {
          created_at?: string | null
          distribucion_socias?: Json | null
          id?: string
          mentora_id: string
          reto_id: string
          score_ponderado?: number | null
          semana: number
        }
        Update: {
          created_at?: string | null
          distribucion_socias?: Json | null
          id?: string
          mentora_id?: string
          reto_id?: string
          score_ponderado?: number | null
          semana?: number
        }
        Relationships: [
          {
            foreignKeyName: "score_mentoras_mentora_id_fkey"
            columns: ["mentora_id"]
            isOneToOne: false
            referencedRelation: "mentoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_mentoras_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      socias_reto: {
        Row: {
          baseline_mensual: number
          cluster_color: string | null
          coordinador_id: string | null
          created_at: string
          crediprice_activo: boolean
          crediprice_monto: number
          desarrolladora_id: string | null
          dias_sin_compra: number
          estado: Database["public"]["Enums"]["socia_estado"]
          fase_seguimiento: string | null
          graduacion_probable:
            | Database["public"]["Enums"]["graduacion_probable"]
            | null
          id: string
          id_socia: string
          mentora_id: string | null
          meta_individual: number
          nombre: string
          operador_id: string | null
          operador_seguimiento_id: string | null
          pct_avance: number
          reto_id: string
          score_cierre: number
          score_gestion: number
          score_presentacion: number
          score_prospeccion: number
          score_recurrencia: number
          scorecard_habilidades: Json | null
          semana_activa: number | null
          telefono: string | null
          tienda_visita: string | null
          updated_at: string
          venta_acumulada: number
          venta_semanal: number
        }
        Insert: {
          baseline_mensual?: number
          cluster_color?: string | null
          coordinador_id?: string | null
          created_at?: string
          crediprice_activo?: boolean
          crediprice_monto?: number
          desarrolladora_id?: string | null
          dias_sin_compra?: number
          estado?: Database["public"]["Enums"]["socia_estado"]
          fase_seguimiento?: string | null
          graduacion_probable?:
            | Database["public"]["Enums"]["graduacion_probable"]
            | null
          id?: string
          id_socia: string
          mentora_id?: string | null
          meta_individual?: number
          nombre: string
          operador_id?: string | null
          operador_seguimiento_id?: string | null
          pct_avance?: number
          reto_id: string
          score_cierre?: number
          score_gestion?: number
          score_presentacion?: number
          score_prospeccion?: number
          score_recurrencia?: number
          scorecard_habilidades?: Json | null
          semana_activa?: number | null
          telefono?: string | null
          tienda_visita?: string | null
          updated_at?: string
          venta_acumulada?: number
          venta_semanal?: number
        }
        Update: {
          baseline_mensual?: number
          cluster_color?: string | null
          coordinador_id?: string | null
          created_at?: string
          crediprice_activo?: boolean
          crediprice_monto?: number
          desarrolladora_id?: string | null
          dias_sin_compra?: number
          estado?: Database["public"]["Enums"]["socia_estado"]
          fase_seguimiento?: string | null
          graduacion_probable?:
            | Database["public"]["Enums"]["graduacion_probable"]
            | null
          id?: string
          id_socia?: string
          mentora_id?: string | null
          meta_individual?: number
          nombre?: string
          operador_id?: string | null
          operador_seguimiento_id?: string | null
          pct_avance?: number
          reto_id?: string
          score_cierre?: number
          score_gestion?: number
          score_presentacion?: number
          score_prospeccion?: number
          score_recurrencia?: number
          scorecard_habilidades?: Json | null
          semana_activa?: number | null
          telefono?: string | null
          tienda_visita?: string | null
          updated_at?: string
          venta_acumulada?: number
          venta_semanal?: number
        }
        Relationships: [
          {
            foreignKeyName: "socias_reto_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          auth_id: string
          created_at: string
          email: string
          id: string
          modo_operativo: string[] | null
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          auth_id: string
          created_at?: string
          email: string
          id?: string
          modo_operativo?: string[] | null
          nombre: string
          rol?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          auth_id?: string
          created_at?: string
          email?: string
          id?: string
          modo_operativo?: string[] | null
          nombre?: string
          rol?: Database["public"]["Enums"]["user_role"]
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ventas_diarias: {
        Row: {
          carga_id: string | null
          created_at: string
          delta_diario: number
          fecha: string
          id: string
          id_socia: string | null
          reto_id: string
          socia_reto_id: string
          venta_acumulada: number
        }
        Insert: {
          carga_id?: string | null
          created_at?: string
          delta_diario?: number
          fecha: string
          id?: string
          id_socia?: string | null
          reto_id: string
          socia_reto_id: string
          venta_acumulada?: number
        }
        Update: {
          carga_id?: string | null
          created_at?: string
          delta_diario?: number
          fecha?: string
          id?: string
          id_socia?: string | null
          reto_id?: string
          socia_reto_id?: string
          venta_acumulada?: number
        }
        Relationships: [
          {
            foreignKeyName: "ventas_diarias_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_diarias_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "socias_reto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_diarias_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pareto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_diarias_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pipeline_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vista_avance_diario_reto: {
        Row: {
          dia_numero: number | null
          diferencia: number | null
          fecha: string | null
          id: string | null
          meta_acumulada_objetivo: number | null
          pct_avance: number | null
          reto_id: string | null
          semana: number | null
          venta_real_acumulada: number | null
        }
        Insert: {
          dia_numero?: number | null
          diferencia?: never
          fecha?: string | null
          id?: string | null
          meta_acumulada_objetivo?: number | null
          pct_avance?: never
          reto_id?: string | null
          semana?: number | null
          venta_real_acumulada?: number | null
        }
        Update: {
          dia_numero?: number | null
          diferencia?: never
          fecha?: string | null
          id?: string | null
          meta_acumulada_objetivo?: number | null
          pct_avance?: never
          reto_id?: string | null
          semana?: number | null
          venta_real_acumulada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_diarias_reto_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_avance_por_coordinador: {
        Row: {
          operador_id: string | null
          operador_nombre: string | null
          pct_avance: number | null
          reto_id: string | null
          total_socias: number | null
          venta_grupo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "socias_reto_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_avance_por_mentora: {
        Row: {
          mentora_id: string | null
          mentora_nombre: string | null
          meta_grupo: number | null
          pct_avance: number | null
          reto_id: string | null
          socias_con_compra: number | null
          socias_en_riesgo: number | null
          socias_inactivas: number | null
          total_socias: number | null
          venta_grupo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "socias_reto_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_cola_trabajo: {
        Row: {
          asignada_a: string | null
          contexto: string | null
          created_at: string | null
          dias_sin_compra: number | null
          estado: string | null
          id: string | null
          id_socia: string | null
          origen: string | null
          pospuesta_hasta: string | null
          prioridad: string | null
          regla_id: string | null
          reto_id: string | null
          socia_estado: Database["public"]["Enums"]["socia_estado"] | null
          socia_nombre: string | null
          socia_reto_id: string | null
          socia_telefono: string | null
          titulo: string | null
          veces_pospuesta: number | null
          venta_acumulada: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acciones_operativas_regla_id_fkey"
            columns: ["regla_id"]
            isOneToOne: false
            referencedRelation: "reglas_metodo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "socias_reto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pareto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acciones_operativas_socia_reto_id_fkey"
            columns: ["socia_reto_id"]
            isOneToOne: false
            referencedRelation: "vista_pipeline_seguimiento"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_pareto: {
        Row: {
          id: string | null
          id_socia: string | null
          mentora_id: string | null
          meta_individual: number | null
          nombre: string | null
          operador_id: string | null
          pct_acumulado: number | null
          pct_del_total: number | null
          reto_id: string | null
          venta_acumulada: number | null
        }
        Relationships: [
          {
            foreignKeyName: "socias_reto_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
      vista_pipeline_seguimiento: {
        Row: {
          estado: Database["public"]["Enums"]["socia_estado"] | null
          fase_seguimiento: string | null
          graduacion_probable:
            | Database["public"]["Enums"]["graduacion_probable"]
            | null
          id: string | null
          id_socia: string | null
          mentora_id: string | null
          nombre: string | null
          operador_id: string | null
          pct_avance: number | null
          reto_id: string | null
          venta_acumulada: number | null
        }
        Insert: {
          estado?: Database["public"]["Enums"]["socia_estado"] | null
          fase_seguimiento?: string | null
          graduacion_probable?:
            | Database["public"]["Enums"]["graduacion_probable"]
            | null
          id?: string | null
          id_socia?: string | null
          mentora_id?: string | null
          nombre?: string | null
          operador_id?: string | null
          pct_avance?: number | null
          reto_id?: string | null
          venta_acumulada?: number | null
        }
        Update: {
          estado?: Database["public"]["Enums"]["socia_estado"] | null
          fase_seguimiento?: string | null
          graduacion_probable?:
            | Database["public"]["Enums"]["graduacion_probable"]
            | null
          id?: string | null
          id_socia?: string | null
          mentora_id?: string | null
          nombre?: string | null
          operador_id?: string | null
          pct_avance?: number | null
          reto_id?: string | null
          venta_acumulada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "socias_reto_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_validar_transicion_estado:
        | {
            Args: {
              p_nuevo_estado: Database["public"]["Enums"]["socia_estado"]
              p_socia_reto_id: string
            }
            Returns: boolean
          }
        | {
            Args: { p_nuevo_estado: string; p_socia_reto_id: string }
            Returns: boolean
          }
      is_director_or_gerente: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      graduacion_probable: "G1" | "G2" | "G3"
      reto_estado:
        | "borrador"
        | "publicado"
        | "cerrado"
        | "activo"
        | "en_cierre"
        | "cancelado"
      socia_estado:
        | "inscrita"
        | "activa"
        | "en_riesgo"
        | "inactiva"
        | "graduada"
        | "no_graduada"
      user_role:
        | "director"
        | "gerente"
        | "operador"
        | "call_center"
        | "mentora"
        | "coordinador"
        | "desarrolladora"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      graduacion_probable: ["G1", "G2", "G3"],
      reto_estado: [
        "borrador",
        "publicado",
        "cerrado",
        "activo",
        "en_cierre",
        "cancelado",
      ],
      socia_estado: [
        "inscrita",
        "activa",
        "en_riesgo",
        "inactiva",
        "graduada",
        "no_graduada",
      ],
      user_role: [
        "director",
        "gerente",
        "operador",
        "call_center",
        "mentora",
        "coordinador",
        "desarrolladora",
      ],
    },
  },
} as const
