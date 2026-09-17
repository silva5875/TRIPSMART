import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/data/queryKeys';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  imagem_perfil: string | null;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profile(user?.id ?? ''),
    queryFn: async (): Promise<Profile | null> => {
      // maybeSingle: `single()` devolve erro PGRST116 quando a linha ainda não
      // existe, o que polui o console sem motivo.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export interface ProfileStats {
  trips: number;
  shared: number;
  likes: number;
}

export function useProfileStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profileStats(user?.id ?? ''),
    queryFn: async (): Promise<ProfileStats> => {
      const [trips, shared, likes] = await Promise.all([
        // `.is('deleted_at', null)`: sem isso, uma viagem que o próprio admin
        // apagou continuava contada aqui para sempre — a política de RLS de
        // admin deixa a linha apagada visível para esta contagem sem filtro.
        supabase
          .from('travel_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .is('deleted_at', null),
        supabase
          .from('shared_itineraries')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .is('deleted_at', null),
        supabase
          .from('itinerary_likes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id),
      ]);

      if (trips.error) throw trips.error;
      if (shared.error) throw shared.error;
      if (likes.error) throw likes.error;

      return {
        trips: trips.count ?? 0,
        shared: shared.count ?? 0,
        likes: likes.count ?? 0,
      };
    },
    enabled: !!user,
    initialData: { trips: 0, shared: 0, likes: 0 },
  });
}

/**
 * Data de nascimento vive em `dtnascimento`, não em `profiles` — de propósito
 * (ver comentário na migration 20260916150000: `profiles` é legível por
 * qualquer usuário autenticado, então manter a data ali a expunha para todo
 * mundo). Este hook lê a linha do PRÓPRIO usuário.
 */
export function useMyBirthDate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.myBirthDate(user?.id ?? ''),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('dtnascimento')
        .select('birth_date')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data?.birth_date ?? null;
    },
    enabled: !!user,
  });
}

export function useUpdateMyBirthDate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (birthDate: string) => {
      // upsert: cobre tanto quem nunca teve linha em dtnascimento (conta
      // antiga, ou login via Google, que não pede data de nascimento) quanto
      // quem está corrigindo um valor já salvo.
      const { error } = await supabase
        .from('dtnascimento')
        .upsert({ user_id: user!.id, birth_date: birthDate });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myBirthDate(user?.id ?? '') });
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { displayName: string }) => {
      const { error } = await supabase.from('profiles').upsert({
        id: user!.id,
        display_name: input.displayName.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id ?? '') });
    },
  });
}

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Constrói a URL pública a partir do caminho salvo em `imagem_perfil`. */
export function getProfileImageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Valida o arquivo escolhido antes de subir — checado pelo componente para
 * poder mostrar a mensagem específica direto (`getErrorMessage` nunca deixa
 * `error.message` cru chegar à tela, então lançar esse texto de dentro da
 * mutation nunca apareceria para quem usa o app).
 */
export function getAvatarFileError(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Selecione um arquivo de imagem.';
  if (file.size > MAX_AVATAR_BYTES) return 'A imagem deve ter no máximo 5 MB.';
  return null;
}

/**
 * Sobe a imagem escolhida para o Storage e grava o caminho em
 * `profiles.imagem_perfil`. O nome do arquivo é o hash SHA-256 do próprio
 * conteúdo — reenviar a mesma foto reaproveita o mesmo objeto (upsert), e
 * trocar a foto de verdade sempre gera um caminho novo.
 */
export function useUploadProfileImage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const validationError = getAvatarFileError(file);
      if (validationError) throw new Error(validationError);

      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      const ext = AVATAR_EXTENSION_BY_MIME[file.type] ?? 'jpg';
      const path = `${user!.id}/${hashHex}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({ id: user!.id, imagem_perfil: path });
      if (dbError) throw dbError;

      return path;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id ?? '') });
    },
  });
}
