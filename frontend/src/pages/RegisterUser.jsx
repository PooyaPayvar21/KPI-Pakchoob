import React from "react";

const RegisterUser = () => {
  return (
    <div className="flex-1 overflow-hidden relative z-10">
      <Header title={"Register New User"} />
      <main className="flex min-h-screen items-center mx-auto justify-center">
        <div
          className={`w-full max-w-3xl backdrop-blur-md rounded-2xl shadow-xl border ${
            isLight
              ? "bg-white/90 border-gray-200"
              : "bg-gray-800/60 border-gray-700"
          }`}
        >
          <div className="p-6">
            <div className="mb-6 text-center">
              <h2
                className={`${
                  isLight ? "text-gray-900" : "text-gray-100"
                } text-2xl font-bold`}
              >
                Register New User
              </h2>
              {message && (
                <div
                  className={`mt-3 text-sm font-medium ${
                    message.includes("successfully")
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {message}
                </div>
              )}
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <div
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-300"
                  } text-sm mb-2`}
                >
                  Account Information
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      className={`${
                        isLight ? "text-gray-600" : "text-gray-400"
                      } text-xs block mb-1`}
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isLight
                          ? "bg-white text-gray-900 border-gray-300"
                          : "bg-gray-900 text-gray-100 border-gray-700"
                      } focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label
                      className={`${
                        isLight ? "text-gray-600" : "text-gray-400"
                      } text-xs block mb-1`}
                    >
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isLight
                          ? "bg-white text-gray-900 border-gray-300"
                          : "bg-gray-900 text-gray-100 border-gray-700"
                      } focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label
                      className={`${
                        isLight ? "text-gray-600" : "text-gray-400"
                      } text-xs block mb-1`}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      autoComplete="name"
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isLight
                          ? "bg-white text-gray-900 border-gray-300"
                          : "bg-gray-900 text-gray-100 border-gray-700"
                      } focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div
                  className={`${
                    isLight ? "text-gray-700" : "text-gray-300"
                  } text-sm mb-2`}
                >
                  User Type
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label
                      className={`${
                        isLight ? "text-gray-600" : "text-gray-400"
                      } text-xs block mb-1`}
                    >
                      Type
                    </label>
                    <select
                      value={userType}
                      onChange={handleUserTypeChange}
                      required
                      className={`w-full px-4 py-3 rounded-lg border ${
                        isLight
                          ? "bg-white text-gray-900 border-gray-300"
                          : "bg-gray-900 text-gray-100 border-gray-700"
                      } focus:ring-2 focus:ring-blue-500`}
                    >
                      {userTypeOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className={isLight ? "bg-white" : "bg-gray-900"}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {userType !== "ceo" && userType !== "superadmin" && (
                <div>
                  <div
                    className={`${
                      isLight ? "text-gray-700" : "text-gray-300"
                    } text-sm mb-2`}
                  >
                    Additional Information
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`${
                          isLight ? "text-gray-600" : "text-gray-400"
                        } text-xs block mb-1`}
                      >
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          isLight
                            ? "bg-white text-gray-900 border-gray-300"
                            : "bg-gray-900 text-gray-100 border-gray-700"
                        } focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                    <div>
                      <label
                        className={`${
                          isLight ? "text-gray-600" : "text-gray-400"
                        } text-xs block mb-1`}
                      >
                        Season
                      </label>
                      <select
                        value={season}
                        onChange={(e) => setSeason(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          isLight
                            ? "bg-white text-gray-900 border-gray-300"
                            : "bg-gray-900 text-gray-100 border-gray-700"
                        } focus:ring-2 focus:ring-blue-500`}
                      >
                        <option
                          value=""
                          className={isLight ? "bg-white" : "bg-gray-900"}
                        >
                          Select Season
                        </option>
                        {options.seasons.map((s) => (
                          <option
                            key={s}
                            value={s}
                            className={isLight ? "bg-white" : "bg-gray-900"}
                          >
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className={`${
                          isLight ? "text-gray-600" : "text-gray-400"
                        } text-xs block mb-1`}
                      >
                        Person
                      </label>
                      <select
                        value={personalCode}
                        onChange={handlePersonChange}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          isLight
                            ? "bg-white text-gray-900 border-gray-300"
                            : "bg-gray-900 text-gray-100 border-gray-700"
                        } focus:ring-2 focus:ring-blue-500`}
                      >
                        <option
                          value=""
                          className={isLight ? "bg-white" : "bg-gray-900"}
                        >
                          Select Person
                        </option>
                        {options.people.map((p) => (
                          <option
                            key={p.personal_code}
                            value={p.personal_code}
                            className={isLight ? "bg-white" : "bg-gray-900"}
                          >
                            {p.full_name} ({p.personal_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className={`${
                          isLight ? "text-gray-600" : "text-gray-400"
                        } text-xs block mb-1`}
                      >
                        Role
                      </label>
                      <select
                        value={kpiRole}
                        onChange={(e) => setKpiRole(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          isLight
                            ? "bg-white text-gray-900 border-gray-300"
                            : "bg-gray-900 text-gray-100 border-gray-700"
                        } focus:ring-2 focus:ring-blue-500`}
                      >
                        <option
                          value=""
                          className={isLight ? "bg-white" : "bg-gray-900"}
                        >
                          Select Role
                        </option>
                        {options.roles.map((r) => (
                          <option
                            key={r}
                            value={r}
                            className={isLight ? "bg-white" : "bg-gray-900"}
                          >
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className={`${
                          isLight ? "text-gray-600" : "text-gray-400"
                        } text-xs block mb-1`}
                      >
                        Direct Management
                      </label>
                      <select
                        value={directManagement}
                        onChange={(e) => setDirectManagement(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          isLight
                            ? "bg-white text-gray-900 border-gray-300"
                            : "bg-gray-900 text-gray-100 border-gray-700"
                        } focus:ring-2 focus:ring-blue-500`}
                      >
                        <option
                          value=""
                          className={isLight ? "bg-white" : "bg-gray-900"}
                        >
                          Direct Management
                        </option>
                        {options.direct_managements.map((dm) => (
                          <option
                            key={dm}
                            value={dm}
                            className={isLight ? "bg-white" : "bg-gray-900"}
                          >
                            {dm}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        className={`${
                          isLight ? "text-gray-600" : "text-gray-400"
                        } text-xs block mb-1`}
                      >
                        Departman
                      </label>
                      <select
                        value={departman}
                        onChange={(e) => setDepartman(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          isLight
                            ? "bg-white text-gray-900 border-gray-300"
                            : "bg-gray-900 text-gray-100 border-gray-700"
                        } focus:ring-2 focus:ring-blue-500`}
                      >
                        <option
                          value=""
                          className={isLight ? "bg-white" : "bg-gray-900"}
                        >
                          Departman
                        </option>
                        {options.departmans.map((d) => (
                          <option
                            key={d}
                            value={d}
                            className={isLight ? "bg-white" : "bg-gray-900"}
                          >
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full cursor-pointer py-3 rounded-lg font-semibold transition-colors ${
                    isLight
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegisterUser;
