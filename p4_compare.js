// P4. 여러 도시 한꺼번에 — p4_compare.js
//
// 상황
//   node p4_compare.js Seoul Busan Jeju Zzzz
//   도시 이름을 여러 개 받아서, 각 도시의 오늘 최고기온을 조회하고 높은 순으로 정렬해 찍는다.
//   조회는 P3 에서 만든 geocode() → forecast() 를 그대로 쓴다 (p3_weather.js). 새로 만들 API 호출은 없다.
//
// 이 문제의 요점
//   1. 도시가 4개면 4번 조회한다. 하나씩 차례로 기다리면(await 를 루프 안에서) 4배 느리다.
//      전부 동시에 시작해 놓고 한꺼번에 기다린다. → map 으로 Promise 4개를 만들고 Promise.allSettled 로 기다림.
//   2. Zzzz 처럼 없는 도시가 섞여 있어도 나머지 3개는 정상 출력되어야 한다.
//      Promise.all 은 하나만 실패해도 전체가 실패한다. 그래서 allSettled — 성공/실패를 각각 돌려준다.
//
// 할 일 (아래 TODO)
//   1. 이름마다 geocode → forecast 를 시작한다 (map + async 함수). map 안에서 await 로 기다리지 말 것.
//   2. Promise.allSettled 로 전부 기다린다.
//   3. status 가 "fulfilled" 인 것은 { city, max: 오늘 최고기온 } 으로 모으고,
//      "rejected" 인 것은 reason.message 를 모은다.
//   4. max 내림차순으로 정렬해서 찍고, 실패한 것은 마지막에 ✗ 줄로.
//
// 실행
//   node p4_compare.js Seoul Busan Jeju Zzzz
//     1. Busan    28.4
//     2. Jeju     27.6
//     3. Seoul    26.9
//     ✗ Zzzz: Unknown place: Zzzz
//   이름은 name.padEnd(8) 로 열을 맞추고, 기온은 toFixed(1).
//
// 확인
//   시간이 진짜 줄었는지: time node p4_compare.js Seoul Busan Jeju 를 루프 안 await 버전과 비교해 보면 안다.
//
// 커밋 메시지: p4: compare cities

import * as fs from "node:fs/promises";
import { geocode, fetchForecastRaw, parseForecast } from "./p3_weather.js";
import { describe } from "./wmo.js";
import chalk from "chalk";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const name = args.find((a) => !a.startsWith("--")) ?? "Seoul";
const cachePath = `cache/${name.toLowerCase()}.json`;

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function label(date) {
  return `${WEEKDAY[new Date(date).getUTCDay()]} ${date.slice(5)}`;
}

function printWeather(place, fc) {
  console.log(
    `${chalk.bold(place.name)}, ${place.country} (${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)})`,
  );

  console.log(
    `Now: ${fc.now.temp.toFixed(1)}${fc.now.unit}, ${describe(fc.now.code)}`,
  );

  for (const day of fc.days) {
    let maxText = day.max.toFixed(1);

    if (day.max >= 30) {
      maxText = chalk.red(maxText);
    } else if (day.max < 10) {
      maxText = chalk.blue(maxText);
    }

    console.log(
      `${label(day.date)}  min ${day.min.toFixed(1)}  max ${maxText}  ${describe(day.code)}`,
    );
  }
}

try {
  if (flags.includes("--offline")) {
    let text;

    try {
      text = await fs.readFile(cachePath, "utf8");
    } catch {
      throw new Error(`no cache for ${name.toLowerCase()}`);
    }

    const { place, raw } = JSON.parse(text);
    const fc = parseForecast(raw);

    printWeather(place, fc);
  } else {
    const place = await geocode(name);

    const raw = await fetchForecastRaw({
      latitude: place.latitude,
      longitude: place.longitude,
    });

    const fc = parseForecast(raw);

    printWeather(place, fc);

    if (flags.includes("--save")) {
      await fs.writeFile(
        cachePath,
        JSON.stringify({ place, raw }, null, 2),
        "utf8",
      );
    }
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
