-- 게시글을 삭제할 수 있는 ADMIN도 해당 게시글의 이미지를 정리할 수 있게 합니다.
-- 업로드는 기존처럼 본인 UUID 폴더에서만 허용합니다.
drop policy if exists "post_images_delete_own_folder" on storage.objects;

create policy "post_images_delete_author_or_admin"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin())
  )
);
