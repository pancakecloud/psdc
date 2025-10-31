import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/client";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

type ClothingItem = { url: string; kind: "top" | "bottom" };

export default function CompleteProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [institute, setInstitute] = useState("");
  const [location, setLocation] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [bio, setBio] = useState("");
  const [aesthetic, setAesthetic] = useState<"aesthetic1" | "aesthetic2" | "">(
    ""
  );
  const [doorKnobFile, setDoorKnobFile] = useState<File | null>(null);
  const [doorKnobUrl, setDoorKnobUrl] = useState<string | null>(null);
  const [clothes, setClothes] = useState<
    Array<{ file: File; kind: "top" | "bottom" }>
  >([]);
  const [selectedKnobPreset, setSelectedKnobPreset] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  function addClothing(fileList: FileList | null, kind: "top" | "bottom") {
    if (!fileList) return;
    const files = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({ file: f, kind }));
    setClothes((prev) => [...prev, ...files]);
  }

  // Placeholder for imgbb upload logic
  // Uploads a file to imgbb and returns the image URL
  async function uploadFile(_path: string, file: File): Promise<string> {
    const apiKey = "83268404e6840efa1bcf3fd0cfb543b9";
    const formData = new FormData();
    formData.append("image", file);
    formData.append("key", apiKey);

    const response = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Failed to upload image to imgbb");
    }
    const data = await response.json();
    if (!data.success || !data.data?.url) {
      throw new Error("imgbb upload did not return a valid URL");
    }
    return data.data.url;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (clothes.length < 6) {
      setError("Please upload at least 6 clothing images.");
      return;
    }
    if (!aesthetic) {
      setError("Please select a clothing aesthetic.");
      return;
    }
    if (!name || !nickname || !institute || !location || !bloodGroup) {
      setError("Please complete all required fields.");
      return;
    }
    setSaving(true);
    try {
      // Upload door knob
      let knobUrl = doorKnobUrl;
      if (doorKnobFile) {
        knobUrl = await uploadFile(
          `users/${user.uid}/knob_${Date.now()}`,
          doorKnobFile
        );
      }

      // Upload clothes
      const clothingUploaded: ClothingItem[] = [];
      for (const c of clothes) {
        const url = await uploadFile(
          `users/${user.uid}/clothes/${Date.now()}_${c.file.name}`,
          c.file
        );
        clothingUploaded.push({ url, kind: c.kind });
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name,
          nickname,
          institute,
          location,
          bloodGroup,
          bio,
          aesthetic,
          doorKnobUrl: knobUrl,
          doorKnobPreset: selectedKnobPreset,
          styles: ["Style1", "Style2", "Style3"],
          clothing: clothingUploaded,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      navigate("/");
    } catch (err: any) {
      setError(err?.message ?? "Failed saving profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container" style={{ padding: 24, maxWidth: 800 }}>
      <h2 style={{ marginBottom: 16 }}>Complete your profile</h2>
      {error && (
        <div className="error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <form className="stack" onSubmit={onSave}>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Nickname</label>
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Educational Institute</label>
            <input
              className="input"
              value={institute}
              onChange={(e) => setInstitute(e.target.value)}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Location</label>
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Blood Group</label>
            <input
              className="input"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Aesthetic</label>
            <select
              className="input"
              value={aesthetic}
              onChange={(e) => setAesthetic(e.target.value as any)}
              required
            >
              <option value="">Select</option>
              <option value="aesthetic1">Aesthetic 1</option>
              <option value="aesthetic2">Aesthetic 2</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea
            className="input"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">
              Door knob (profile picture, circle crop)
            </label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setDoorKnobFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Select a door knob preset</label>
            <select
              className="input"
              value={selectedKnobPreset ?? ""}
              onChange={(e) => setSelectedKnobPreset(e.target.value || null)}
            >
              <option value="">None</option>
              <option value="knob1">Knob 1</option>
              <option value="knob2">Knob 2</option>
              <option value="knob3">Knob 3</option>
              <option value="knob4">Knob 4</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label className="label">Upload clothing (top)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => addClothing(e.target.files, "top")}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Upload clothing (bottom)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => addClothing(e.target.files, "bottom")}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 8,
          }}
        >
          {clothes.map((c, idx) => (
            <div key={idx} className="card" style={{ padding: 6 }}>
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {c.kind}
              </div>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: "50%",
                }}
              >
                <img
                  src={URL.createObjectURL(c.file)}
                  alt="clothing"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save & continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
