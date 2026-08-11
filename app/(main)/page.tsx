"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  ImageIcon,
  Plus,
  Upload,
  MapPin,
  Hash,
  Image as LucideImage,
  X,
  Trash2,
} from "lucide-react";
import { StoriesBar } from "@/components/stories-bar";
import { VisualPostCard } from "@/components/visual-post-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { containsInappropriateContent } from "@/lib/moderation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function InstagramFeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para la creación de posts visuales
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");

  const [showDeletePostDialog, setShowDeletePostDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Nuevos estados para el sistema de Badges (Hashtags)
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const fetchVisualFeed = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);

      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          users (nombre, apellido, avatar_url),
          comments (id, content, created_at, user_id, parent_id, users(nombre, apellido, avatar_url)),
          reactions (id, user_id)
        `,
        )
        .eq("type", "VISUAL")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching visual feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisualFeed();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setImageFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const handleDeletePost = (postId: string) => {
    setPostToDelete(postId);
    setShowDeletePostDialog(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postToDelete);

      if (error) throw error;

      setPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== postToDelete),
      );

      setShowDeletePostDialog(false);
      setPostToDelete(null);

      toast.add({
        title: "Post Deleted",
        description: "The visual post has been successfully deleted.",
        type: "success",
      });
    } catch (error) {
      console.error("Error deleting post:", error);

      toast.add({
        title: "Error",
        description: "There was an error deleting the post.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- LÓGICA DE HASHTAGS (BADGES) ---
  const confirmAddTag = () => {
    const newTag = tagInput.trim().replace(/^#/, "").toLowerCase();

    // Validaciones: no vacío, máx 20 chars, máx 10 tags en total, y no repetidos
    if (
      newTag &&
      newTag.length <= 20 &&
      hashtags.length < 10 &&
      !hashtags.includes(newTag)
    ) {
      setHashtags([...hashtags, newTag]);
    }

    setTagInput("");
    setIsAddingTag(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      confirmAddTag();
    } else if (e.key === "Escape") {
      setIsAddingTag(false);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setHashtags(hashtags.filter((t) => t !== tagToRemove));
  };
  // -----------------------------------

  const handleUpload = async () => {
    if (!currentUserId || imageFiles.length === 0) return;

    if (caption.trim() && containsInappropriateContent(caption)) {
      toast.add({
        title: "Inappropriate Content",
        description:
          "Your caption contains inappropriate language. Please keep it academic and respectful.",
        type: "warning",
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of imageFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentUserId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("post_media")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const url = supabase.storage.from("post_media").getPublicUrl(filePath)
          .data.publicUrl;
        uploadedUrls.push(url);
      }

      const { error: postError } = await supabase.from("posts").insert({
        user_id: currentUserId,
        type: "VISUAL",
        content: caption.trim(),
        image_url: uploadedUrls[0],
        media_urls: uploadedUrls,
        location: location.trim() || null,
        hashtags: hashtags.length > 0 ? hashtags : null, // Enviamos el array directo
      });

      if (postError) throw postError;

      setIsUploadOpen(false);
      setImageFiles([]);
      setCaption("");
      setLocation("");
      setHashtags([]);

      fetchVisualFeed();

      toast.add({
        title: "Success",
        description: "Your visual post has been published.",
        type: "success",
      });
    } catch (error: any) {
      toast.add({
        title: "Error",
        description: "Error uploading post: " + error.message,
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-4">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <StoriesBar currentUserId={currentUserId} />
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Campus Feed</h2>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger>
              <button
                data-protected="true"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 shadow-sm transition-transform hover:scale-105"
              >
                <Plus size={18} /> New Post
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-card border-border h-[90vh] sm:h-auto overflow-y-auto hide-scrollbar">
              <DialogHeader>
                <DialogTitle>Create Visual Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Image preview area */}
                {imageFiles.length > 0 ? (
                  <div className="relative w-full px-10">
                    <Carousel
                      opts={{
                        align: "start",
                        containScroll: "trimSnaps",
                      }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-2">
                        {imageFiles.map((file, idx) => (
                          <CarouselItem
                            key={idx}
                            className="pl-2 basis-1/3 sm:basis-1/4"
                          >
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-border group">
                              <img
                                src={URL.createObjectURL(file)}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />

                              <button
                                onClick={() => removeFile(idx)}
                                className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </CarouselItem>
                        ))}

                        {imageFiles.length < 5 && (
                          <CarouselItem className="pl-2 basis-1/3 sm:basis-1/4">
                            <label className="aspect-square w-full flex items-center justify-center border-2 border-dashed border-border rounded-lg hover:bg-muted/50 cursor-pointer text-muted-foreground transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                              />
                              <Plus size={24} />
                            </label>
                          </CarouselItem>
                        )}
                      </CarouselContent>

                      {/* Left control */}
                      <div className="absolute -left-8 top-1/2 -translate-y-1/2">
                        <CarouselPrevious className="static translate-y-0" />
                      </div>

                      {/* Right control */}
                      <div className="absolute -right-8 top-1/2 -translate-y-1/2">
                        <CarouselNext className="static translate-y-0" />
                      </div>
                    </Carousel>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <label className="w-full h-40 border-2 border-dashed border-border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer flex flex-col items-center justify-center text-muted-foreground overflow-hidden relative">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <LucideImage size={32} className="mb-2 opacity-50" />
                      <span className="text-sm font-medium">
                        Select up to 5 photos
                      </span>
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    placeholder="Write a caption..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1">
                    <MapPin size={14} /> Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Library"
                  />
                </div>

                {/* --- SISTEMA DE BADGES (HASHTAGS) --- */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <Hash size={14} /> Hashtags
                    </label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {hashtags.length}/10 tags
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center p-3 bg-muted border border-border rounded-lg min-h-[46px]">
                    {hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-primary/20 text-primary border border-primary/20 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors hover:bg-primary/30"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-primary hover:text-primary/70 transition-colors"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </span>
                    ))}

                    {hashtags.length < 10 &&
                      (isAddingTag ? (
                        <input
                          autoFocus
                          type="text"
                          value={tagInput}
                          onChange={(e) =>
                            setTagInput(e.target.value.slice(0, 20))
                          } // Límite de 20 caracteres
                          onKeyDown={handleTagKeyDown}
                          onBlur={confirmAddTag}
                          className="bg-background border border-border text-foreground rounded-md px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary w-24"
                          placeholder="tag..."
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="bg-background text-muted-foreground border border-dashed border-border hover:bg-muted-foreground/10 hover:text-foreground px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus size={12} /> Add
                        </button>
                      ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Press Space or Enter to add a tag.
                  </p>
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={isUploading || imageFiles.length === 0}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {isUploading ? "Publishing..." : "Publish Visual Post"}
              </button>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={showDeletePostDialog}
            onOpenChange={(open) => {
              if (!isDeleting) {
                setShowDeletePostDialog(open);

                if (!open) {
                  setPostToDelete(null);
                }
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Post</AlertDialogTitle>

                <AlertDialogDescription>
                  WARNING: This action will permanently delete this post and all
                  its content. This cannot be undone. Are you sure?
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={confirmDeletePost}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 size={16} className="mr-2" />
                  )}
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="h-px w-full bg-border mb-8" />

        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-xl shadow-sm">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="font-semibold text-foreground">
                There are no visual posts yet
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to share a moment with the campus.
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <VisualPostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onDelete={handleDeletePost}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
