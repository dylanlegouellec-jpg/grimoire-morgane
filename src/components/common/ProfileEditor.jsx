import { useRef, useState } from "react";
import { Check, UserCircle2, X } from "lucide-react";
import { saveProfile, uploadAvatar } from "../../utils/profile";
import { triggerHaptic } from "../../utils/helpers";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import Flourish from "./Flourish";

/* ------------------------------------------------------------------ */
/*  MODIFIER LE PROFIL — sous-modale ouverte depuis la carte de profil  */
/*  en tête des Réglages (bouton "Modifier le profil" ou appui long sur  */
/*  l'avatar/le nom). Prénom, nom, surnom et photo — mêmes garanties      */
/*  hors-ligne que le reste de l'app (voir utils/profile.js).             */
/* ------------------------------------------------------------------ */
export default function ProfileEditor({ user, profile, onClose, onSaved, showToast }) {
  useBodyScrollLock(true);

  const [firstName, setFirstName] = useState((profile && profile.first_name) || "");
  const [lastName, setLastName] = useState((profile && profile.last_name) || "");
  const [username, setUsername] = useState((profile && (profile.username || profile.display_name)) || "");
  const [avatarUrl, setAvatarUrl] = useState((profile && profile.avatar_url) || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleAvatarClick = () => {
    triggerHaptic(15);
    fileRef.current && fileRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file, user.id);
      await saveProfile(user.id, { avatarUrl: url });
      setAvatarUrl(url);
      onSaved && onSaved({ avatar_url: url });
      showToast && showToast("Photo de profil mise à jour !");
    } catch (err) {
      console.error(err);
      showToast && showToast("Échec de l'envoi de la photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (saving || !user) return;
    setSaving(true);
    try {
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();
      const trimmedUsername = username.trim();
      await saveProfile(user.id, { firstName: trimmedFirst, lastName: trimmedLast, username: trimmedUsername });
      onSaved && onSaved({ first_name: trimmedFirst, last_name: trimmedLast, username: trimmedUsername });
      showToast && showToast("Profil mis à jour !");
      onClose();
    } catch (err) {
      console.error(err);
      showToast && showToast("Échec de l'enregistrement du profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal grimoire-page" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 className="dropcap-title">Modifier le profil</h2>
        <Flourish />

        <div className="profile-editor-row" style={{ marginBottom: 18 }}>
          <button type="button" className="avatar-picker" onClick={handleAvatarClick} disabled={uploading} title="Changer la photo">
            {avatarUrl ? <img src={avatarUrl} alt="" className="avatar-img" loading="lazy" decoding="async" /> : <UserCircle2 size={26} />}
          </button>
          <p className="hint" style={{ fontStyle: "normal", margin: 0 }}>
            {uploading ? "Envoi de la photo…" : "Touche la photo pour la changer."}
          </p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />

        <div className="field-row">
          <label className="field">
            <span>Prénom</span>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Morgane" />
          </label>
          <label className="field">
            <span>Nom</span>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" />
          </label>
        </div>
        <label className="field">
          <span>Nom d'utilisateur / Surnom</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={user.email}
          />
        </label>
        <p className="hint" style={{ fontStyle: "normal", marginTop: 2 }}>
          Le surnom est visible par les autres membres de tes foyers.
        </p>

        <div className="cookmode-nav" style={{ marginTop: 16 }}>
          <button type="button" className="seal seal-gold" onClick={handleSave} disabled={saving}>
            <Check size={16} /> {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
