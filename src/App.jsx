import { useRef, useState, useEffect } from "react";
import "./App.css";
import liff from "@line/liff";
import previewImage from "./assets/images/preview.png";
import {
  initializeApp,
  getFunctions,
  httpsCallable,
  firebaseConfig,
} from "./firebaseConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function App() {
  const [energy, setEnergy] = useState("");
  const [oneServe, setOneServe] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nutrition, setNutrition] = useState([]);
  const [rawText, setRawText] = useState("");
  const app = initializeApp(firebaseConfig);
  const functions = getFunctions(app, "asia-southeast1");

  var cameraStream = null;
  const previewImageRef = useRef(null);
  const cameraRef = useRef(null);
  const snapshotRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const startStreaming = async () => {
    const mediaSupport = "mediaDevices" in navigator;
    if (mediaSupport && null == cameraStream) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: "environment",
            width: { exact: 1280 },
            height: { exact: 720 },
            focusMode: "macro",
          },
        })
        .then(function (mediaStream) {
          cameraStream = mediaStream;
          streamRef.current.srcObject = mediaStream;
          streamRef.current.play();
        })
        .catch(function (err) {
          console.log("Unable to access camera: " + err);
        });
    } else {
      alert("Your browser does not support media devices.");
      return;
    }
  };

  const captureSnapshot = () => {
    if (null != cameraStream) {
      var ctx = canvasRef.current.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        streamRef.current,
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      previewImageRef.current.src = canvasRef.current.toDataURL("image/png");
      ocr(canvasRef.current.toDataURL("image/png"));
    }
  };

  const stopStreaming = () => {
    if (null != cameraStream) {
      const track = cameraStream.getTracks()[0];
      track.stop();
      streamRef.current.load();
      cameraStream = null;
    }
  };

  const getBase64 = (file) => {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      previewImageRef.current.src = reader.result;
      ocr(reader.result);
    };
    reader.onerror = function (error) {
      console.log("Error: ", error);
    };
  };

  const fileInput = (event) => {
    const file = event.target.files[0];
    const validImageTypes = ["image/gif", "image/jpeg", "image/png"];
    if (file) {
      if (validImageTypes.includes(file.type)) {
        previewImageRef.current.style.objectFit = "contain";
        cameraRef.current.style.display = "none";
        snapshotRef.current.style.display = "block";
        getBase64(file);
        stopStreaming();
      }
    }
  };

  const btnStream = () => {
    startStreaming();
    cameraRef.current.style.display = "block";
    snapshotRef.current.style.display = "none";
  };

  const btnCapture = () => {
    captureSnapshot();
    cameraRef.current.style.display = "none";
    snapshotRef.current.style.display = "block";
    stopStreaming();
  };

  function handleTextEnergy(result) {
    let results = result.fullTextAnnotation.text
      .replace(/\./g, "")
      .replace(/[^ก-๙\d\n]+/g, "");

    const startWord = "พลังงานทั้งหมด";
    const endWord = "กิโลแคลอรี";

    const indexOfStartWord = results.indexOf(startWord);
    const indexOfEndWord = results.indexOf(endWord);

    const testKilocal =
      indexOfStartWord !== -1 && indexOfEndWord !== -1
        ? results.substring(indexOfStartWord, indexOfEndWord + endWord.length)
        : text;

    const textSpaceKilocal = testKilocal.replace(/(\d+)/g, " $1 ");

    let data = {
      kilocal: textSpaceKilocal,
    };

    return data;
  }

  function handleTextOneServe(result) {
    let oneServing = [];
    let results = result.fullTextAnnotation.text
      .replace(/\./g, "")
      .replace(/[^ก-๙\d\n]+/g, "");

    results.split("\n").forEach((row) => {
      const items = row.split(" ").join("");
      const newText = items.split("\n");
      const regexFoundOneServe = /หนึ่งหน่วยบริโภค/;
      const filteredTextOneServe = newText.filter((item) =>
        regexFoundOneServe.test(item)
      );

      let units = ["มก", "มิลลิกรัม", "มล", "มิลลิลิตร", "กรัม", "ก"];

      filteredTextOneServe.forEach((text) => {
        const textSpaceNumber = text.replace(/(\d+)/g, " $1 ");
        units.forEach((unit) => {
          const endIndex = textSpaceNumber.indexOf(unit);
          const result = textSpaceNumber.substring(0, endIndex + unit.length);

          let checkUnit =
            result.substr(
              result.length - unit.length,
              result.length - unit.length + unit.length
            ) === unit;

          if (checkUnit) {
            oneServing.push(result);
          }
        });
      });
    });

    let data = {
      infoOneServe: oneServing,
    };

    return data;
  }

  function handleTextNutrition(result) {
    let nutrition = [];
    let results = result.fullTextAnnotation.text
      .replace(/\./g, "")
      .replace(/[^ก-๙\d\n]+/g, "");
    console.log(results)
    results.split("\n").forEach((row) => {
      const items = row.split(" ").join("");
      const newText = items.split("\n");
      const regexFoundNutrition = /[ก-๙]+\d+ก$|[ก-๙]+\d+มก$/;
      const filteredText = newText.filter((item) =>
        regexFoundNutrition.test(item)
      );

      filteredText.forEach((text) => {
        const regexSplit = /(\D+)(\d+)(\D+)/;
        const textMatch = text.match(regexSplit);
        nutrition.push(textMatch);
      });
    });

    // const transformedText = nutrition.map((item) => {
    //   return item[0].replace(/(\d+)(ก|มก)$/, (match, numericValue, unit) => {
    //     const newUnit = unit === "ก" ? "กรัม" : "มิลลิกรัม";
    //     return `${numericValue}${newUnit}`;
    //   });
    // });

    // let concatenatedText = "";

    // for (const word of transformedText) {
    //   concatenatedText += word;
    // }

    let data = {
      nutrition: nutrition,
      raw_text: results,
    };

    return data;
  }

  async function ocr(base64encoded) {
    setRawText("");
    setNutrition([]);
    setIsLoading(true);
    setEnergy("");
    setOneServe([]);
    const visionAPI = await httpsCallable(functions, "visionAPI");
    visionAPI({ base64: base64encoded })
      .then((results) => {
        const { result } = results.data;
        let { nutrition, raw_text } = handleTextNutrition(result);
        let { infoOneServe } = handleTextOneServe(result);
        let { kilocal } = handleTextEnergy(result);
        if (nutrition.length > 0) {
          setNutrition(nutrition);
          setRawText(raw_text);
        }

        if (infoOneServe.length > 0) {
          setOneServe(infoOneServe[0]);
        }

        if (kilocal != "") {
          setEnergy(kilocal);
        }
      })
      .catch((error) => {
        console.error(error.code, error.message);
      });
  }

  async function playSound(text) {
    responsiveVoice.speak(text);
    setIsPlaying(true);
  }

  function pauseSound() {
    responsiveVoice.pause();
    setIsPlaying(false);
  }

  const checkPlayingSound = () => {
    if (responsiveVoice.isPlaying()) {
      console.log("is playing");
      setIsPlaying(true);
    } else {
      console.log("not playing");
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    responsiveVoice.setDefaultVoice("Thai Female");
    responsiveVoice.setDefaultRate(1);
    liff.init(
      { liffId: import.meta.env.VITE_LIFF_ID },
      () => {
        if (liff.isLoggedIn()) {
          liff
            .getProfile()
            .then((profile) => {
              console.log(profile);
            })
            .catch((err) => console.log(err));
        } else {
          liff.login();
        }
      },
      (err) => console.log(err)
    );

    const intervalId = setInterval(checkPlayingSound, 5000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <div className="flex justify-center w-full h-full">
        <div className="mt-6 sm:mt-4 w-4/5 h-4/5">
          <div className="mt-6 sm:mt-6">
            <div className="w-full h-full object-cover">
              <div
                id="camera"
                ref={cameraRef}
                className="relative block overflow-hidden rounded-lg w-full h-full sm:w-full sm:h-full"
              >
                <video
                  id="stream"
                  ref={streamRef}
                  className="w-full h-full rounded-lg"
                ></video>
                <div id="horizontal-line"></div>
                <div onClick={() => btnCapture()}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <canvas
                id="canvas"
                width={640}
                height={1136}
                className="w-full h-full group relative block overflow-hidden rounded-lg object-cover"
                ref={canvasRef}
              ></canvas>

              <div id="snapshot" ref={snapshotRef}>
                <img
                  src={previewImage}
                  alt="image"
                  width={640}
                  height={1136}
                  className="w-full h-full sm:w-full sm:h-full object-cover transition duration-500 group-hover:scale-105 rounded-lg"
                  ref={previewImageRef}
                />
              </div>
            </div>

            <div className="mt-2 relative border border-gray-100 bg-white p-2 rounded-lg w-full h-full sm:w-full sm:h-full">
              <div className="flex">
                <button
                  onClick={() => btnStream()}
                  className="block w-full rounded bg-yellow-400 p-2.5 text-sm font-bold text-white hover:text-black font-medium transition hover:scale-105 flex-initial me-2"
                >
                  ถ่ายรูปภาพ
                </button>
                <label
                  htmlFor="fileInput"
                  className="block w-full rounded bg-yellow-400 p-2.5 text-sm font-bold text-white hover:text-black font-medium transition hover:scale-105 hover:text-black flex-initial ms-2 text-center"
                >
                  เลือกรูปภาพ
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={fileInput}
                  />
                </label>
              </div>

              <div className="mt-5">
                <div className="flex justify-between">
                  <div>
                    <span className="whitespace-nowrap bg-green-400 px-3 py-1.5 text-xs font-medium text-white">
                      ผลลัพท์
                    </span>
                  </div>
                  <div className="flex-row">
                    {isPlaying ? (
                      <button
                        className="whitespace-nowrap bg-sky-400 px-3 py-1.5 text-xs font-medium me-1 text-white rounded-lg font-bold transition hover:scale-105 hover:text-black"
                        onClick={() => pauseSound()}
                      >
                        หยุดเล่น
                      </button>
                    ) : nutrition.length > 0 ? (
                      <button
                        className="whitespace-nowrap bg-sky-400 px-3 py-1.5 text-xs font-medium me-1 text-white rounded-lg font-bold transition hover:scale-105 hover:text-black"
                        onClick={() => playSound(rawText)}
                      >
                        เล่นเสียง
                      </button>
                    ) : (
                      <button
                        className="whitespace-nowrap bg-gray-400 px-3 py-1.5 text-xs font-medium me-1 text-white rounded-lg font-bold transition"
                        onClick={() => playSound(rawText)}
                        disabled
                      >
                        เล่นเสียง
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex mt-3 justify-center">
                  {oneServe.length > 0 ? (
                    <span className="w-full text-center whitespace-nowrap border border-gray-200 rounded-lg px-3 px-3 py-1.5 py-1.5 text-sm text-black font-meduim text-black">
                      {oneServe}
                    </span>
                  ) : (
                    <span></span>
                  )}
                </div>

                <div className="flex mt-2 justify-center">
                  {energy != "" ? (
                    <span className="w-full text-center whitespace-nowrap border border-gray-200 rounded-lg px-3 px-3 py-1.5 py-1.5 text-sm text-black font-meduim text-black ">
                      {energy}
                    </span>
                  ) : (
                    <span></span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 mt-2">
                  <table className="table-fixed min-w-full divide-y-2 divide-gray-200 bg-white text-sm">
                    <thead className="ltr:text-left rtl:text-right">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-left">
                          ส่วนประกอบ
                        </th>
                        <th className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-right">
                          ปริมาณ / หน่วย
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {nutrition.map((data) => (
                        <tr key={data[0]}>
                          <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-900 text-left">
                            <p className="font-medium">{data[1]}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 font-medium text-gray-700 text-right">
                            <p className="font-medium">
                              {data[2]} /
                              {data[3] === "ก" ? "กรัม" : "มิลลิกรัม"}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-center w-full mt-5 mb-5">
                    {isLoading ? (
                      nutrition.length > 0 ? (
                        <p></p>
                      ) : (
                        <FontAwesomeIcon
                          className="text-4xl animate-spin"
                          icon={faSpinner}
                        />
                      )
                    ) : (
                      <p></p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
