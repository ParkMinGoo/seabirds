# 호조비 다이버 개발 인수인계

이 문서는 다른 Windows 컴퓨터에서 **호조비 다이버** 개발을 이어가기 위한 안내서다. 현재 앱은 SeaBirds를 기반으로 커스터마이징한 Android 중심의 개인 다이빙 로그북이다.

## 현재 상태

- 앱 이름: 호조비 다이버
- Android 패키지: `com.dldpadkdl1.peregrinelogbook`
- 현재 Android 버전: `1.0.28` (`versionCode 29`)
- 대상 기기: Android
- 다이빙 컴퓨터: Shearwater Peregrine 계열 Bluetooth 로그 다운로드
- Firebase 프로젝트: `peregrine-logbook-mg-2026`
- Firebase Android App ID: `1:286187361545:android:e4a4a37559fe7c9bafefd8`
- 기본 브랜치: `main`

최근 구현된 주요 기능:

- 전체 한국어 UI와 Android 시스템 뒤로가기 보호
- Peregrine Bluetooth 로그 선택 다운로드
- 종이 로그북 형태의 상세 화면과 항목별 빠른 수정
- 로그번호 자동 증가, 수면휴식 자동 계산, 수심·수온·압력 정보 표시
- 사진·동영상 첨부, 미리보기와 삭제
- 손가락 그림판: 색상, 굵기, 지우개, 되돌리기, PNG 저장
- 여행 그룹: 시작·끝 로그 선택, 날짜별 일차 구분, 입수 시간순 정렬
- 여행 그룹 영구 저장 및 재실행 복원
- Text, PDF, UDDF 내보내기

## 새 컴퓨터에서 시작하기

필요한 프로그램:

- Git
- Node.js LTS
- Android Studio와 Android SDK
- JDK 17 이상(일반적으로 Android Studio 내장 JBR 사용 가능)

저장소를 내려받고 의존성을 설치한다.

```powershell
git clone https://github.com/Three-Cats-LSP/seabirds.git
cd seabirds
npm ci
```

웹 앱 테스트:

```powershell
npm test
```

Playwright 브라우저가 없다면 먼저 설치한다.

```powershell
npx playwright install
```

## 소스 구조

- `index.html`: 화면 구조와 다이얼로그
- `seabirds.css`: 전체 화면, 종이 로그북, 여행 그룹 디자인
- `app-core.js`: 공용 상태와 저장 커밋 처리
- `storage.js`: IndexedDB 영구 저장, 사진·영상·그룹 저장
- `dive-list.js`: 로그 목록, 필터, 여행 그룹 목록
- `dive-editor.js`: 상세 로그북, 빠른 수정, 첨부 파일과 그림판
- `devices-ui.js`, `shearwater.js`: Bluetooth와 Shearwater 통신
- `photo-log-import.js`: 종이 로그북 사진 인식 연결
- `ko.js`: 한국어 번역
- `settings-ui.js`: 설정, 장비 목록과 그룹 편집
- `tests/app-smoke.spec.js`: 주요 기능 회귀 테스트
- `www/`: Android 앱에 포함되는 동기화된 웹 자산
- `android/`: Capacitor Android 프로젝트

루트 웹 파일을 수정한 뒤 반드시 `www/`를 갱신한다.

```powershell
npm run sync:www
```

이 명령은 배포 자산 검증도 수행한다. Android Studio에서 빌드하기 전 `www/`와 `android/app/src/main/assets/public/`의 최신 상태를 확인한다.

Android 프로젝트의 앱 자산까지 한 번에 복사하려면 다음 명령을 사용한다.

```powershell
npm run android:sync
```

## Android 빌드

최초 실행 시 `android/local.properties`에 로컬 Android SDK 위치가 필요할 수 있다. 이 파일과 `google-services.json`, 서명 키는 보안상 Git에 포함되지 않는다.

```powershell
npm run android:sync
cd android
./gradlew test assembleDebug
```

Windows에서 `./gradlew`가 실행되지 않으면 다음을 사용한다.

```powershell
.\gradlew.bat test assembleDebug
```

결과 APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

버전을 올릴 때 `android/app/build.gradle`의 `versionCode`와 `versionName`을 함께 변경한다. 이미 Firebase에 올린 `versionCode`는 재사용하지 않는다.

## Firebase 설정과 배포

새 컴퓨터에서 Firebase CLI를 설치하고 로그인한다.

```powershell
npm install -g firebase-tools
firebase login
```

Android용 Firebase 설정 파일은 Git에 없으므로 Firebase Console에서 이 앱의 `google-services.json`을 내려받아 다음 위치에 둔다.

```text
android/app/google-services.json
```

테스터 이메일은 공개 저장소에 기록하지 않는다. 배포 시 승인된 테스터 주소를 명령에 직접 넣거나 Firebase Console의 테스터 그룹을 사용한다.

```powershell
firebase appdistribution:distribute android/app/build/outputs/apk/debug/app-debug.apk `
  --app "1:286187361545:android:e4a4a37559fe7c9bafefd8" `
  --project "peregrine-logbook-mg-2026" `
  --testers "테스터주소1,테스터주소2" `
  --release-notes "변경 내용"
```

## 여행 그룹 데이터

여행 그룹은 `state.diveGroups`에 저장되고 `storage.js`가 IndexedDB의 `metadata/state` 안에 영구 보관한다. 범위 그룹의 구조는 다음과 같다.

```json
{
  "id": "group-uuid",
  "name": "7월 세부여행",
  "type": "range",
  "startNumber": 181,
  "endNumber": 188
}
```

그룹 편집기의 시작·끝 콤보박스는 현재 로그의 `diveNumber`와 포인트 제목으로 만들어진다. 그룹 상세 화면에서는 날짜별로 `1일차`, `2일차`를 만들고 같은 날짜 안에서 입수 시간순으로 정렬한다.

## 데이터와 보안 주의사항

- 실제 로그 데이터, 가져온 UDDF, 사진, 동영상은 Git에 올리지 않는다.
- `imports/`와 `outputs/`는 Git에서 제외된다.
- APK, Firebase 로그인 토큰, 테스터 이메일, 서명 키를 커밋하지 않는다.
- 앱 데이터는 로컬 IndexedDB가 기본이며 Firebase 동기화는 선택 사항이다.
- 작업 전 `git status`로 다른 사람이 만든 변경을 확인하고 관련 없는 변경을 덮어쓰지 않는다.

## 변경 후 확인 순서

1. 관련 Playwright 테스트를 실행한다.
2. 가능하면 전체 `npm test`를 실행한다.
3. `npm run sync:www`로 Android 자산을 갱신한다.
4. `./gradlew test assembleDebug`로 Android 빌드를 검증한다.
5. 버전 번호와 릴리스 노트를 확인한 뒤 Firebase에 배포한다.

현재 기준으로 전체 24개 Playwright 테스트와 Android `test assembleDebug` 빌드가 통과했다.
