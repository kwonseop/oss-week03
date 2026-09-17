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

// P4. 여러 도시 비교

import { geocode, forecast } from "./p3_weather.js";
import chalk from "chalk";

const names = process.argv.slice(2);

if (names.length === 0) {
  console.error("Usage: node p4_compare.js <city> [city...]");
  process.exit(1);
}

// 이름마다 geocode → forecast 작업을 시작, 예시로는 총 4번 실행
const promises = names.map(async (name) => {
  const place = await geocode(name); // 현재 도시의 위치 정보 조회
  const fc = await forecast(place); // 서울 날씨 요청 -> fc / days 의 현재 날씨와 일별 예보를 받음

  return {
    city: place.name,
    max: fc.days[0].max, // 오늘의 값이 필요한거니 [0]값 가져옴 (배열엔 오늘, 내일, 모레가 순서대로 들어있음)
  };
});

const results = await Promise.allSettled(promises); // 모든 작업이 끝날 때까지 기다림
//ㄴ 이 Promise들이 성공하든 실패하든 전부 끝날 때까지 기다리고 각각의 결과를 반환
// 성공 → status: "fulfilled", value에 결과
// 실패 → status: "rejected", reason에 에러

const success = [];
const failed = [];

for (let i = 0; i < results.length; i++) {
  const result = results[i]; // 결과를 하나씩 검사

  // 성공한 경우 value에 결과가 들어있음
  if (result.status === "fulfilled") {
    success.push(result.value);
  } else {
    // 실패한 경우 reason에 에러 정보가 들어있음
    failed.push({
      name: names[i],
      message: result.reason.message,
    });
  }
}

success.sort((a, b) => b.max - a.max); // 오늘 최고기온 내림차순 정렬

// 성공한 도시 출력
for (let i = 0; i < success.length; i++) {
  const { city, max } = success[i];

  const cityText = chalk.bold(city.padEnd(8)); // 도시 이름을 8칸에 맞춘 후 굵게 출력

  let maxText = max.toFixed(1); // 최고 기온을 소수점 첫째 자리까지 출력

  if (max >= 30) {
    // 최고 기온이 30도 이상이면 빨간색으로 출력
    maxText = chalk.red(maxText);
  } else if (max < 10) {
    // 최고 기온이 10도 미만이면 파란색으로 출력
    maxText = chalk.blue(maxText);
  }

  console.log(`${i + 1}. ${cityText} ${maxText}`); // 순위, 도시 이름, 최고 기온 출력
}

// 실패한 도시 출력
for (const error of failed) {
  console.log(`✗ ${error.name}: ${error.message}`);
}
